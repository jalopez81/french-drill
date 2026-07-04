import { useMemo, useState } from 'react';
import type { CourseUnit, VocabEntry } from '../types';
import { courseUnits, calculateUnitProgress } from '../utils/course';

interface CourseViewProps {
  vocabulary: VocabEntry[];
  onStartUnit: (unit: CourseUnit) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: '#00c875',
  A2: '#00d2d2',
  B1: '#fdab3d',
  B2: '#a25ddc',
};

export function CourseView({ vocabulary, onStartUnit }: CourseViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const unitsWithProgress = useMemo(() => {
    return courseUnits.map((unit) => ({
      unit,
      progress: calculateUnitProgress(unit, vocabulary),
    }));
  }, [vocabulary]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return unitsWithProgress;
    return unitsWithProgress.filter(
      ({ unit }) =>
        unit.title.toLowerCase().includes(q) ||
        unit.id.toLowerCase().includes(q) ||
        unit.level.toLowerCase().includes(q),
    );
  }, [unitsWithProgress, searchQuery]);

  const totalUnits = courseUnits.length;
  const startedUnits = unitsWithProgress.filter(({ progress }) => progress > 0).length;
  const overallProgress =
    totalUnits > 0
      ? Math.round(unitsWithProgress.reduce((sum, { progress }) => sum + progress, 0) / totalUnits)
      : 0;

  return (
    <section className="course-view" aria-label="Curso de francés">
      <div className="course-view__header">
        <div className="course-view__stats">
          <div className="course-stat">
            <span className="course-stat__value">{totalUnits}</span>
            <span className="course-stat__label">Unidades</span>
          </div>
          <div className="course-stat">
            <span className="course-stat__value">{startedUnits}</span>
            <span className="course-stat__label">Iniciadas</span>
          </div>
          <div className="course-stat">
            <span className="course-stat__value">{overallProgress}%</span>
            <span className="course-stat__label">Dominio global</span>
          </div>
        </div>
        <div className="course-view__overall-bar">
          <div
            className="course-view__overall-fill"
            style={{ width: `${overallProgress}%` }}
            role="progressbar"
            aria-valuenow={overallProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progreso global: ${overallProgress}%`}
          />
        </div>
      </div>

      <div className="course-view__search-wrap">
        <input
          type="search"
          className="course-view__search"
          placeholder="Buscar unidad…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Buscar unidad del curso"
        />
      </div>

      <ul className="course-unit-list" aria-label="Lista de unidades">
        {filtered.map(({ unit, progress }) => {
          const levelColor = LEVEL_COLORS[unit.level] ?? '#0085ff';
          return (
            <li key={unit.id}>
              <button
                type="button"
                className="course-unit-card"
                onClick={() => onStartUnit(unit)}
                aria-label={`Unidad ${unit.order}: ${unit.title} — ${progress}% dominio`}
              >
                <div className="course-unit-card__left">
                  <span
                    className="course-unit-card__order"
                    style={{ background: levelColor }}
                    aria-hidden="true"
                  >
                    {unit.order}
                  </span>
                </div>
                <div className="course-unit-card__body">
                  <div className="course-unit-card__top">
                    <span className="course-unit-card__title">{unit.title}</span>
                    <span
                      className="course-unit-card__level"
                      style={{ color: levelColor }}
                    >
                      {unit.level}
                    </span>
                  </div>
                  <div className="course-unit-card__sentences">
                    {unit.sentences.length} oración{unit.sentences.length !== 1 ? 'es' : ''}
                  </div>
                  <div className="course-unit-card__progress-wrap">
                    <div className="course-unit-card__progress-bar">
                      <div
                        className="course-unit-card__progress-fill"
                        style={{ width: `${progress}%`, background: levelColor }}
                      />
                    </div>
                    <span className="course-unit-card__progress-label">{progress}%</span>
                  </div>
                </div>
                <span className="course-unit-card__chevron" aria-hidden="true">›</span>
              </button>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="course-unit-list__empty">No se encontraron unidades.</li>
        )}
      </ul>
    </section>
  );
}
