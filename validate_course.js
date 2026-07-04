import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const endId = startId + 19;
    const unitTargetIds = Array.from({ length: 20 }, (_, i) => startId + i);
    const unitCovered = new Set();

    unit.sentences.forEach(s => {
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

        const textLower = s.text.toLowerCase();
        const wordLower = vocabWord.word.toLowerCase();
        
        // Basic check: is the word root or full word present?
        const rootWord = wordLower.substring(0, Math.min(4, wordLower.length));
        if (!textLower.includes(rootWord) && !textLower.includes(wordLower)) {
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
    // process.exit(1);
  } else {
    console.log('✅ Validation PASSED! No errors found.');
  }
}

validateCourse();
