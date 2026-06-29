import type { StudyLanguage } from '../config/languages';

interface LanguageFlagProps {
  lang: StudyLanguage;
  className?: string;
  title?: string;
}

export function LanguageFlag({ lang, className = 'language-flag', title }: LanguageFlagProps) {
  if (lang === 'fr') {
    return (
      <svg
        className={className}
        viewBox="0 0 3 2"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={title ?? 'Bandera de Francia'}
      >
        <rect width="1" height="2" fill="#002395" />
        <rect width="1" height="2" x="1" fill="#fff" />
        <rect width="1" height="2" x="2" fill="#ed2939" />
      </svg>
    );
  }

  return (
    <svg
      className={className}
      viewBox="0 0 60 30"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? 'Bandera del Reino Unido'}
    >
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#c8102e" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  );
}
