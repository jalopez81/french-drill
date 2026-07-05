import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRENCH_ARTICLES = [
  'le ', 'la ', 'les ', 'l\'', 'un ', 'une ', 'des ',
  'du ', 'de la ', 'de l\'', 'au ', 'aux ', 'à la ', 'à l\'',
];

function stripFrenchArticles(word) {
  let w = word.toLowerCase().trim();
  if (w.startsWith("l'")) return w.slice(2);
  for (const article of FRENCH_ARTICLES) {
    if (w.startsWith(article)) return w.slice(article.length);
  }
  return w;
}

function deaccent(text) {
  return text.normalize('NFD').replace(/\p{M}/gu, '');
}

function getWordSearchVariants(vocabWord) {
  const variants = new Set();
  const lower = vocabWord.toLowerCase().trim();
  variants.add(lower);

  const stripped = stripFrenchArticles(lower);
  variants.add(stripped);

  if (lower.startsWith("l'")) variants.add(lower.slice(2));
  if (stripped.startsWith('se ')) variants.add(stripped.slice(3));
  if (stripped.startsWith("s'")) variants.add(stripped.slice(2));

  const parts = stripped.split(/\s+/);
  if (parts[0] === 'se' && parts.length > 1) {
    variants.add(parts.slice(1).join(' '));
  }

  if (stripped.length >= 4) variants.add(stripped.slice(0, 4));
  if (stripped.length >= 5) variants.add(stripped.slice(0, 5));

  return [...variants].filter((v) => v.length >= 3);
}

function wordVisibleInText(vocabWord, text) {
  const textLower = text.toLowerCase();
  const textPlain = deaccent(textLower);
  const variants = getWordSearchVariants(vocabWord);

  for (const variant of variants) {
    if (textLower.includes(variant)) return true;
    const plain = deaccent(variant);
    if (plain.length >= 3 && textPlain.includes(plain)) return true;
  }

  return false;
}

function validateCourse() {
  const vocabPath = path.join(__dirname, 'french_vocab.json');
  const coursePath = path.join(__dirname, 'course.json');

  if (!fs.existsSync(vocabPath)) {
    console.error('Missing french_vocab.json');
    process.exit(1);
  }
  if (!fs.existsSync(coursePath)) {
    console.error('Missing course.json');
    process.exit(1);
  }

  const vocab = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
  const course = JSON.parse(fs.readFileSync(coursePath, 'utf8'));

  const vocabMap = new Map(vocab.map(w => [w.id, w]));

  let errors = [];
  let warnings = [];

  course.units.forEach(unit => {
    console.log(`Checking Unit: ${unit.id} - ${unit.title} (${unit.level})`);
    
    const unitOrder = unit.order;
    const startId = 31 + (unitOrder - 1) * 20;
    const endId = Math.min(startId + 19, 2000);
    const length = endId - startId + 1;
    const unitTargetIds = Array.from({ length }, (_, i) => startId + i);
    const unitCovered = new Set();

    unit.sentences.forEach(s => {
      for (const field of ['text_past', 'text_future', 'translation_past', 'translation_future']) {
        if (!s[field]?.trim()) {
          errors.push(`[${s.id}] Missing tense field "${field}"`);
        }
      }

      const words = s.text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡]/g, "").split(/\s+/).filter(Boolean);
      if (words.length > 15) {
        warnings.push(`[${s.id}] Text is long (${words.length} words): "${s.text}"`);
      }

      let targetCount = 0;
      s.wordIds.forEach(id => {
        if (!vocabMap.has(id)) {
          errors.push(`[${s.id}] Invalid wordId: ${id}`);
          return;
        }

        const vocabWord = vocabMap.get(id);
        
        if (id >= startId && id <= endId) {
          targetCount++;
          unitCovered.add(id);
        }

        if (!wordVisibleInText(vocabWord.word, s.text)) {
          warnings.push(`[${s.id}] Check visibility of wordId ${id} ("${vocabWord.word}") in text: "${s.text}"`);
        }
      });

      if (targetCount > 4) {
        errors.push(`[${s.id}] Has ${targetCount} target IDs from the current batch (max 4 allowed): ${s.wordIds.filter(id => id >= startId && id <= endId).join(', ')}`);
      }
    });

    const missing = unitTargetIds.filter(id => !unitCovered.has(id));
    if (missing.length > 0) {
      errors.push(`[Unit ${unit.id}] Missing target IDs: ${missing.map(id => `${id} (${vocabMap.get(id)?.word})`).join(', ')}`);
    }
  });

  console.log('\n--- VALIDATION SUMMARY ---');
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    warnings.forEach(w => console.log('  ⚠️ ' + w));
  }
  if (errors.length > 0) {
    console.error(`Errors (${errors.length}):`);
    errors.forEach(e => console.error('  ❌ ' + e));
    process.exit(1);
  } else {
    console.log('✅ Validation PASSED! No errors found.');
  }
}

validateCourse();
