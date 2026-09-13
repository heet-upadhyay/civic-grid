import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Cpu } from 'lucide-react';
import { useI18n } from '../../i18n/useI18n';

interface AIProcessingStepsProps {
  isComplete?: boolean;
}

export const AIProcessingSteps: React.FC<AIProcessingStepsProps> = ({ isComplete = false }) => {
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, label: t.submit.aiStep1 },
    { id: 2, label: t.submit.aiStep2 },
    { id: 3, label: t.submit.aiStep3 },
    { id: 4, label: t.submit.aiStep4 },
  ];

  useEffect(() => {
    if (isComplete) {
      setCurrentStep(4);
      return;
    }
    const intervals = [800, 1600, 2400];
    const timers = intervals.map((delay, i) => setTimeout(() => setCurrentStep(i + 2), delay));
    return () => timers.forEach(clearTimeout);
  }, [isComplete]);

  return (
    <div
      className="space-y-6 rounded-[var(--radius)] border p-6 sm:p-8"
      style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
      aria-live="polite"
      aria-label="Processing status"
    >
      <div className="h-1 w-full overflow-hidden rounded-[var(--radius)]" style={{ backgroundColor: 'var(--color-border)' }}>
        <div
          className="h-full transition-all duration-700 ease-in-out"
          style={{ width: `${(currentStep / 4) * 100}%`, backgroundColor: 'var(--color-primary)' }}
        />
      </div>

      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)]"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            color: 'var(--color-primary)',
          }}
        >
          <Cpu className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
          {t.submit.submittingBtn}
        </p>
      </div>

      <ul className="mx-auto max-w-sm space-y-3">
        {steps.map((step) => {
          const done = currentStep > step.id;
          const active = currentStep === step.id;
          return (
            <li
              key={step.id}
              className="flex items-center gap-3"
              style={{ opacity: done || active ? 1 : 0.45 }}
            >
              {done ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--color-success)' }} />
              ) : active ? (
                <div
                  className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
                />
              ) : (
                <Circle className="h-5 w-5 shrink-0" style={{ color: 'var(--color-border)' }} />
              )}
              <span
                className="text-sm"
                style={{
                  color: done || active ? 'var(--color-text)' : 'var(--color-muted)',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
