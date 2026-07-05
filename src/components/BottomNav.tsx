import type { Tab } from '../types';

interface BottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  vocabCount: number;
  dueFlashcards: number;
}

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'course', label: 'Curso', icon: '🎓' },
  { id: 'practice', label: 'Práctica libre', icon: '⚡' },
  { id: 'flashcards', label: 'Memoria', icon: '🧠' },
  { id: 'vocabulary', label: 'Vocabulario', icon: '📝' },
  { id: 'settings', label: 'Ajustes', icon: '🛠' },
];

export function BottomNav({
  active,
  onChange,
  vocabCount,
  dueFlashcards,
}: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`bottom-nav__item ${active === tab.id ? 'bottom-nav__item--active' : ''}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <span className="bottom-nav__icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
          {tab.id === 'vocabulary' && vocabCount > 0 && (
            <span className="bottom-nav__badge">{vocabCount}</span>
          )}
          {tab.id === 'flashcards' && dueFlashcards > 0 && (
            <span className="bottom-nav__badge">{dueFlashcards}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
