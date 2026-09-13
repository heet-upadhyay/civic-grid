import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';
import type { SupportedLanguage } from '../../i18n/types';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
}) => {
  const { language, setLanguage, languages, currentMeta } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select website language"
        className="flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all hover:opacity-90 active:scale-95 focus:outline-none"
        style={{
          borderColor: isOpen ? 'var(--color-primary)' : 'var(--color-border)',
          backgroundColor: isOpen
            ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)'
            : 'var(--color-surface)',
          color: isOpen ? 'var(--color-primary)' : 'var(--color-text)',
        }}
      >
        <Globe className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden />
        <span className="hidden sm:inline font-medium">{currentMeta.nativeLabel}</span>
        <span className="sm:hidden uppercase font-semibold text-[11px]">{currentMeta.code}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available languages"
          className="absolute right-0 mt-1.5 w-48 sm:w-52 rounded-xl border p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100"
          style={{
            backgroundColor: 'var(--color-elevated)',
            borderColor: 'var(--color-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-muted)' }}>
            Choose Language
          </div>
          <div className="space-y-0.5 mt-1">
            {languages.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(lang.code)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors text-left"
                  style={{
                    backgroundColor: isSelected
                      ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                      : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                  }}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{lang.nativeLabel}</span>
                    <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
                      {lang.label}
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
