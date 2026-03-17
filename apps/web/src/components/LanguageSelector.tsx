import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { cn } from '@/lib/utils';

export default function LanguageSelector({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language.split('-')[0]}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      aria-label="Select language"
      className={cn(
        'text-[11px] text-muted-foreground bg-transparent border-none outline-none cursor-pointer',
        'hover:text-foreground transition-colors appearance-none pr-1',
        className
      )}
    >
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code} className="bg-background text-foreground">
          {label}
        </option>
      ))}
    </select>
  );
}
