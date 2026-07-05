import { COURSE_TENSE_LABELS, COURSE_TENSES } from '../utils/course';
import type { CourseTense } from '../types';

interface CourseTenseSelectorProps {
  value: CourseTense;
  onChange: (tense: CourseTense) => void;
}

export function CourseTenseSelector({ value, onChange }: CourseTenseSelectorProps) {
  return (
    <div className="course-tense-selector" role="group" aria-label="Tiempo verbal">
      {COURSE_TENSES.map((tense) => (
        <button
          key={tense}
          type="button"
          className={`course-tense-selector__btn${value === tense ? ' course-tense-selector__btn--active' : ''}`}
          onClick={() => onChange(tense)}
          aria-pressed={value === tense}
        >
          {COURSE_TENSE_LABELS[tense]}
        </button>
      ))}
    </div>
  );
}
