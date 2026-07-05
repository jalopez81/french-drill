import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { CourseUnit, VocabEntry } from '../types';
import {
  calculateUnitProgress,
  calculateUnitStudyProgress,
  getCourseUnits,
  getUnitDisplayLevel,
  hasStartedUnit,
  isCourseLoaded,
  loadCourseData,
  unitMatchesSearch,
  LEXICON_LEVELS,
  type LexiconLevel,
} from '../utils/course';

interface CourseViewProps {
  vocabulary: VocabEntry[];
  openedUnits: Set<string>;
  onStartUnit: (unit: CourseUnit) => void;
  onStudyUnitInMemory?: (unitId: string) => void;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: '#00c875',
  A2: '#00d2d2',
  B1: '#fdab3d',
  B2: '#a25ddc',
};

export function CourseView({
  vocabulary,
  openedUnits,
  onStartUnit,
  onStudyUnitInMemory,
}: CourseViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LexiconLevel | ''>('');
  const [ready, setReady] = useState(isCourseLoaded());

  useEffect(() => {
    loadCourseData().then(() => setReady(true));
  }, []);

  const courseUnits = useMemo(() => (ready ? getCourseUnits() : []), [ready]);

  const unitsWithProgress = useMemo(() => {
    return courseUnits.map((unit) => ({
      unit,
      level: getUnitDisplayLevel(unit),
      studyProgress: calculateUnitStudyProgress(unit, vocabulary),
      masteryProgress: calculateUnitProgress(unit, vocabulary),
      started: hasStartedUnit(unit, vocabulary, openedUnits),
    }));
  }, [courseUnits, vocabulary, openedUnits]);

  const filtered = useMemo(() => {
    let list = unitsWithProgress;
    if (levelFilter) {
      list = list.filter(({ level }) => level === levelFilter);
    }
    const q = searchQuery.trim();
    if (!q) return list;
    return list.filter(({ unit, level }) => {
      if (level.toLowerCase().includes(q.toLowerCase())) return true;
      return unitMatchesSearch(unit, q);
    });
  }, [unitsWithProgress, searchQuery, levelFilter]);

  const totalUnits = courseUnits.length;
  const startedUnits = unitsWithProgress.filter(({ started }) => started).length;
  const overallProgress =
    totalUnits > 0
      ? Math.round(
          unitsWithProgress.reduce((sum, { masteryProgress }) => sum + masteryProgress, 0) / totalUnits,
        )
      : 0;
  const overallStudyProgress =
    totalUnits > 0
      ? Math.round(
          unitsWithProgress.reduce((sum, { studyProgress }) => sum + studyProgress, 0) / totalUnits,
        )
      : 0;

  if (!ready) {
    return (
      <section className="course-view course-view--loading" aria-label="Curso de francés">
        <p className="hint course-view__loading">Cargando curso…</p>
      </section>
    );
  }

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
            <span className="course-stat__value">{overallStudyProgress}%</span>
            <span className="course-stat__label">Repaso SRS</span>
          </div>
          <div className="course-stat">
            <span className="course-stat__value">{overallProgress}%</span>
            <span className="course-stat__label">Dominio SRS</span>
          </div>
        </div>
        <div className="course-view__overall-bar">
          <div
            className="course-view__overall-fill course-view__overall-fill--study"
            style={{ width: `${overallStudyProgress}%` }}
            role="progressbar"
            aria-valuenow={overallStudyProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Vocabulario visto: ${overallStudyProgress}%`}
          />
          <div
            className="course-view__overall-fill course-view__overall-fill--mastery"
            style={{ width: `${overallProgress}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="course-view__filters">
        <div className="course-view__level-buttons" role="group" aria-label="Filtrar por nivel">
          <button
            type="button"
            className={`course-level-btn course-level-btn--all${levelFilter === '' ? ' course-level-btn--active' : ''}`}
            onClick={() => setLevelFilter('')}
            aria-pressed={levelFilter === ''}
          >
            Todos
          </button>
          {LEXICON_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              className={`course-level-btn${levelFilter === level ? ' course-level-btn--active' : ''}`}
              style={{ '--level-color': LEVEL_COLORS[level] } as CSSProperties}
              onClick={() => setLevelFilter(levelFilter === level ? '' : level)}
              aria-pressed={levelFilter === level}
            >
              {level}
            </button>
          ))}
        </div>
        <label className="course-view__search-field">
          <span className="sr-only">Buscar unidad del curso</span>
          <input
            type="search"
            className="course-view__search"
            placeholder="Buscar unidad u oración…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            enterKeyHint="search"
          />
        </label>
      </div>

      <ul className="course-unit-list" aria-label="Lista de unidades">
        {filtered.map(({ unit, level, studyProgress, masteryProgress }) => {
          const levelColor = LEVEL_COLORS[level] ?? '#0085ff';
          return (
            <li key={unit.id}>
              <div className="course-unit-card-wrap">
                <button
                  type="button"
                  className="course-unit-card"
                  onClick={() => onStartUnit(unit)}
                  aria-label={`Unidad ${unit.order}: ${unit.title} — ${studyProgress}% visto, ${masteryProgress}% dominio`}
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
                        {level}
                      </span>
                    </div>
                    <div className="course-unit-card__sentences">
                      {unit.sentences.length} oración{unit.sentences.length !== 1 ? 'es' : ''}
                    </div>
                    <div className="course-unit-card__progress-wrap">
                      <div className="course-unit-card__progress-bar">
                        <div
                          className="course-unit-card__progress-fill course-unit-card__progress-fill--study"
                          style={{ width: `${studyProgress}%`, background: levelColor }}
                        />
                        <div
                          className="course-unit-card__progress-fill course-unit-card__progress-fill--mastery"
                          style={{ width: `${masteryProgress}%`, background: levelColor, opacity: 0.45 }}
                        />
                      </div>
                      <span className="course-unit-card__progress-label">
                        SRS {studyProgress}% · Dom. {masteryProgress}%
                      </span>
                    </div>
                  </div>
                  <span className="course-unit-card__chevron" aria-hidden="true">›</span>
                </button>
                {onStudyUnitInMemory && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm course-unit-card__memory-btn"
                    onClick={() => onStudyUnitInMemory(unit.id)}
                    aria-label={`Repasar vocabulario de ${unit.title} en Memoria`}
                    title="Repasar en Memoria"
                  >
                    🧠
                  </button>
                )}
              </div>
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
