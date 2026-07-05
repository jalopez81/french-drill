#!/usr/bin/env node
/**
 * Enriquece course.json con variantes pasado/futuro vía Gemini Flash Lite.
 *
 * Añade por oración: text_past, text_future, translation_past, translation_future
 *
 * API key: .env.local → VITE_GEMINI_API_KEY, o env GEMINI_API_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COURSE_PATH = path.join(__dirname, 'course.json');
const VOCAB_PATH = path.join(__dirname, 'french_vocab.json');
const BACKUP_PATH = path.join(__dirname, 'course.json.bak');
const MODEL = 'gemini-3.1-flash-lite';

const BATCH_SPLITS = [20, 10, 5, 3, 1];
const REQUIRED_FIELDS = ['text_past', 'text_future', 'translation_past', 'translation_future'];

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    sentences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text_past: { type: 'string' },
          text_future: { type: 'string' },
          translation_past: { type: 'string' },
          translation_future: { type: 'string' },
        },
        required: REQUIRED_FIELDS.concat(['id']),
      },
    },
  },
  required: ['sentences'],
};

class RateLimitError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'RateLimitError';
    this.status = status;
  }
}

class ChunkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ChunkError';
  }
}

// ── CLI ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    batch: 20,
    delay: 2000,
    unit: null,
    startUnit: null,
    from: null,
    to: null,
    force: false,
    dryRun: false,
    noFillGaps: false,
  };
  for (const arg of argv) {
    if (arg.startsWith('--batch=')) opts.batch = Math.max(1, Number(arg.split('=')[1]) || 20);
    else if (arg.startsWith('-b=')) opts.batch = Math.max(1, Number(arg.split('=')[1]) || 20);
    else if (arg.startsWith('--delay=')) opts.delay = Math.max(0, Number(arg.split('=')[1]) || 0);
    else if (arg.startsWith('--unit=')) opts.unit = arg.split('=')[1];
    else if (arg.startsWith('--start-unit=')) opts.startUnit = arg.split('=')[1];
    else if (arg.startsWith('--from=')) opts.from = Number(arg.split('=')[1]);
    else if (arg.startsWith('--to=')) opts.to = Number(arg.split('=')[1]);
    else if (arg === '--force') opts.force = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--no-fill-gaps') opts.noFillGaps = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`
Uso: node enrich_course_tenses.js [opciones]

  --batch=N     Oraciones por llamada a Gemini (default: 20)
  --delay=MS    Pausa entre llamadas exitosas en ms (default: 2000)
  --unit=ID          Solo una unidad (ej. a1-u01)
  --start-unit=ID    Desde esta unidad inclusive (ej. a1-u02)
  --from=N           Primera unidad por order (inclusive)
  --to=N             Última unidad por order (inclusive)
  --force            Regenerar aunque ya existan campos
  --dry-run          Imprimir prompt, no llamar API
  --no-fill-gaps     No rellenar unidades fuera del rango al final

Batch adaptativo: si falla un chunk, se divide 20→10→5→3→1 antes de abortar.
Por defecto rellena huecos pendientes fuera del rango filtrado.
`);
      process.exit(0);
    }
  }
  return opts;
}

// ── Env ─────────────────────────────────────────────────────
function loadApiKey() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*VITE_GEMINI_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) {
        let v = m[1].trim().replace(/^["']|["']$/g, '');
        if (v) return v;
      }
    }
  }
  return process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function splitSizeFor(chunkLen) {
  for (let i = 0; i < BATCH_SPLITS.length - 1; i++) {
    if (chunkLen > BATCH_SPLITS[i + 1]) return BATCH_SPLITS[i + 1];
  }
  return null;
}

// ── Prompt ──────────────────────────────────────────────────
function buildPrompt(unit, sentences, vocabMap) {
  const payload = sentences.map((s) => {
    const words = s.wordIds.map((id) => {
      const w = vocabMap.get(id);
      return w ? { id, word: w.word, translation: w.translation } : { id, word: '?' };
    });
    return {
      id: s.id,
      text_present: s.text,
      translation_present: s.translation,
      target_words: words,
    };
  });

  return [
    'Eres un generador de contenido para una app de francés (nivel A1–B2).',
    'Para cada oración en PRESENTE, crea variantes en PASÉ COMPOSÉ/IMPARFAIT (según encaje) y FUTUR SIMPLE/proche.',
    '',
    'Reglas estrictas:',
    '- Mantén el diálogo Marie/Paul si existe.',
    '- Cada text_* debe incluir visiblemente las mismas target_words (formas conjugadas válidas).',
    '- Máximo ~15 palabras por oración en francés.',
    '- translation_* en español natural, mismo tono que translation_present.',
    '- No cambies wordIds; solo genera textos y traducciones.',
    '',
    'Responde SOLO JSON válido (sin markdown):',
    '{"sentences":[{"id":"...","text_past":"...","text_future":"...","translation_past":"...","translation_future":"..."}]}',
    '',
    `Unidad: ${unit.id} — ${unit.title} (${unit.level})`,
    '',
    JSON.stringify(payload, null, 2),
  ].join('\n');
}

// ── Parser tolerante ────────────────────────────────────────
function pickField(obj, keys) {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return null;
  const id = pickField(row, ['id', 'sentence_id', 'sentenceId']);
  if (!id) return null;
  return {
    id,
    text_past: pickField(row, ['text_past', 'textPast', 'past', 'text_passe', 'text_passé']),
    text_future: pickField(row, ['text_future', 'textFuture', 'future', 'text_futur']),
    translation_past: pickField(row, ['translation_past', 'translationPast', 'past_translation']),
    translation_future: pickField(row, ['translation_future', 'translationFuture', 'future_translation']),
  };
}

function parseResponseTolerant(text) {
  if (!text || typeof text !== 'string') {
    throw new ChunkError('Respuesta vacía de Gemini');
  }

  let raw = text.trim();
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        parsed = JSON.parse(objMatch[0]);
      } catch {
        throw new ChunkError('JSON inválido en respuesta');
      }
    } else {
      const arrMatch = raw.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          parsed = { sentences: JSON.parse(arrMatch[0]) };
        } catch {
          throw new ChunkError('JSON inválido en respuesta');
        }
      } else {
        throw new ChunkError('JSON inválido en respuesta');
      }
    }
  }

  let sentences;
  if (Array.isArray(parsed)) {
    sentences = parsed;
  } else if (parsed && typeof parsed === 'object') {
    sentences = parsed.sentences ?? parsed.sentence ?? parsed.results ?? parsed.data;
  }

  if (!Array.isArray(sentences)) {
    throw new ChunkError('JSON sin array "sentences"');
  }

  return sentences.map(normalizeRow).filter(Boolean);
}

function validateAndMerge(chunk, rows) {
  const byId = new Map();
  for (const row of rows) {
    if (row?.id) byId.set(row.id, row);
  }

  for (const sentence of chunk) {
    const row = byId.get(sentence.id);
    if (!row) {
      throw new ChunkError(`Gemini no devolvió id ${sentence.id}`);
    }
    mergeResults(sentence, row);
  }
}

// ── Gemini ──────────────────────────────────────────────────
async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.35,
      },
    }),
  });

  if (res.status === 429) {
    const detail = await res.text();
    throw new RateLimitError(`Gemini 429: ${detail.slice(0, 200)}`, 429);
  }

  if (!res.ok) {
    const detail = await res.text();
    const err = new ChunkError(`Gemini ${res.status}: ${detail.slice(0, 400)}`);
    if (/rate.?limit|quota|resource.?exhausted/i.test(detail)) {
      throw new RateLimitError(err.message, res.status);
    }
    throw err;
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new ChunkError('Respuesta vacía de Gemini');

  return parseResponseTolerant(text);
}

function mergeResults(sentence, row) {
  for (const f of REQUIRED_FIELDS) {
    const v = String(row[f] ?? '').trim();
    if (!v) throw new ChunkError(`[${sentence.id}] falta campo "${f}"`);
    sentence[f] = v;
  }
}

function needsEnrichment(sentence, force) {
  if (force) return true;
  return !sentence.text_past || !sentence.text_future;
}

function saveCourse(course) {
  fs.writeFileSync(COURSE_PATH, JSON.stringify(course, null, 4) + '\n', 'utf8');
}

function countPending(course, force) {
  let n = 0;
  for (const unit of course.units) {
    n += unit.sentences.filter((s) => needsEnrichment(s, force)).length;
  }
  return n;
}

async function processChunk(unit, chunk, vocabMap, apiKey, state) {
  const ids = chunk.map((s) => s.id).join(', ');
  console.log(`  🔄 llamada ${++state.totalCalls} (${chunk.length}): ${ids}`);

  try {
    const rows = await callGemini(buildPrompt(unit, chunk, vocabMap), apiKey);
    validateAndMerge(chunk, rows);
    saveCourse(state.course);
    state.totalSentences += chunk.length;
    console.log(`  ✅ guardado (${state.totalSentences} oraciones totales)`);
    return;
  } catch (err) {
    if (err instanceof RateLimitError) {
      state.delay = Math.min(Math.max(state.delay * 2, 4000), 120000);
      console.warn(`  ⏳ rate limit — delay → ${state.delay}ms, reintentando…`);
      await sleep(state.delay);
      state.totalCalls--;
      return processChunk(unit, chunk, vocabMap, apiKey, state);
    }

    const subSize = splitSizeFor(chunk.length);
    if (subSize == null) {
      console.error(`  ❌ ${err.message}`);
      console.error('  Chunk de 1 oración falló; abortando.');
      process.exit(1);
    }

    console.warn(`  ⚠️ falló chunk (${chunk.length}): ${err.message}`);
    console.warn(`  ↳ dividiendo en sub-chunks de ≤${subSize}`);

    for (let i = 0; i < chunk.length; i += subSize) {
      const sub = chunk.slice(i, i + subSize);
      await processChunk(unit, sub, vocabMap, apiKey, state);
      if (state.delay > 0 && i + subSize < chunk.length) {
        await sleep(state.delay);
      }
    }
  }
}

function selectUnits(allUnits, opts) {
  let units = allUnits;
  if (opts.unit) return units.filter((u) => u.id === opts.unit);
  if (opts.startUnit) {
    const idx = units.findIndex((u) => u.id === opts.startUnit);
    if (idx === -1) {
      console.error(`❌ Unidad desconocida: ${opts.startUnit}`);
      process.exit(1);
    }
    units = units.slice(idx);
  }
  if (opts.from != null) units = units.filter((u) => u.order >= opts.from);
  if (opts.to != null) units = units.filter((u) => u.order <= opts.to);
  return units;
}

function unitsWithPending(allUnits, force) {
  return allUnits.filter((u) => u.sentences.some((s) => needsEnrichment(s, force)));
}

async function enrichUnits(units, opts, apiKey, vocabMap, state) {
  for (const unit of units) {
    const pending = unit.sentences.filter((s) => needsEnrichment(s, opts.force));
    if (pending.length === 0) {
      console.log(`⏭  ${unit.id} — ya completa`);
      continue;
    }

    console.log(`\n📦 ${unit.id} — ${pending.length} oraciones (${opts.batch}/llamada, delay=${state.delay}ms)`);

    for (let i = 0; i < pending.length; i += opts.batch) {
      const chunk = pending.slice(i, i + opts.batch);

      if (opts.dryRun) {
        const prompt = buildPrompt(unit, chunk, vocabMap);
        console.log('── PROMPT ──');
        console.log(prompt.slice(0, 1200) + '…');
        continue;
      }

      await processChunk(unit, chunk, vocabMap, apiKey, state);

      if (state.delay > 0 && i + opts.batch < pending.length) {
        await sleep(state.delay);
      }
    }
  }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const apiKey = loadApiKey();

  if (!opts.dryRun && !apiKey) {
    console.error('❌ Falta API key: VITE_GEMINI_API_KEY en .env.local');
    process.exit(1);
  }

  const course = JSON.parse(fs.readFileSync(COURSE_PATH, 'utf8'));
  const vocab = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
  const vocabMap = new Map(vocab.map((w) => [w.id, w]));

  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(COURSE_PATH, BACKUP_PATH);
    console.log(`📋 Backup → ${BACKUP_PATH}`);
  }

  const primaryUnits = selectUnits(course.units, opts);
  const state = {
    course,
    delay: opts.delay,
    totalCalls: 0,
    totalSentences: 0,
  };

  await enrichUnits(primaryUnits, opts, apiKey, vocabMap, state);

  let pendingLeft = countPending(course, opts.force);
  if (pendingLeft > 0 && !opts.noFillGaps && !opts.dryRun) {
    const gapUnits = unitsWithPending(course.units, opts.force).filter(
      (u) => !primaryUnits.includes(u),
    );
    if (gapUnits.length > 0) {
      console.log(`\n🔧 Rellenando ${gapUnits.length} unidad(es) pendientes fuera del rango…`);
      await enrichUnits(gapUnits, opts, apiKey, vocabMap, state);
      pendingLeft = countPending(course, opts.force);
    }
  }

  console.log(`\n✅ Listo. ${state.totalSentences} oraciones enriquecidas, ${state.totalCalls} llamadas.`);
  console.log(`📊 Pendientes restantes: ${pendingLeft} oraciones`);
  if (pendingLeft > 0) {
    console.error('❌ Quedan oraciones sin enriquecer.');
    process.exit(1);
  }
  console.log('   Ejecuta: node validate_course.js');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
