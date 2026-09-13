import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mic, Cpu, BarChart3, CheckCircle2, MapPin, AlertTriangle, Zap, Trash2, Droplets } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

const LandingPage: React.FC = () => {
  const { t } = useI18n();

  const steps = [
    {
      icon: Mic,
      label: '01',
      title: t.landing.step1Title,
      description: t.landing.step1Desc,
      color: 'var(--color-primary)',
    },
    {
      icon: Cpu,
      label: '02',
      title: t.landing.step2Title,
      description: t.landing.step2Desc,
      color: 'var(--color-accent)',
    },
    {
      icon: BarChart3,
      label: '03',
      title: t.landing.step3Title,
      description: t.landing.step3Desc,
      color: 'var(--color-success)',
    },
    {
      icon: CheckCircle2,
      label: '04',
      title: t.landing.step4Title,
      description: t.landing.step4Desc,
      color: 'var(--color-primary)',
    },
  ] as const;

  const issueExamples = [
    { icon: AlertTriangle, label: t.landing.issuePotholes, color: '#e8a54b' },
    { icon: Droplets, label: t.landing.issueWater, color: '#4a8fd4' },
    { icon: Zap, label: t.landing.issuePower, color: '#f79009' },
    { icon: Trash2, label: t.landing.issueSanitation, color: '#52b788' },
  ];

  return (
    <div className="space-y-10 sm:space-y-14 lg:space-y-20 xl:space-y-24 pb-8 sm:pb-12 lg:pb-16">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-3xl pt-6 sm:pt-8 text-center lg:pt-12 px-4 sm:px-6">
        <div
          className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] sm:px-4 sm:py-1.5 sm:text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
            color: 'var(--color-primary)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)',
          }}
        >
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
              style={{ backgroundColor: 'var(--color-primary)' }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--color-primary)' }}
            />
          </span>
          {t.landing.badge}
        </div>

        <h1
          className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
          style={{ lineHeight: 1.12 }}
        >
          {t.landing.heroTitle}{' '}
          <span style={{ color: 'var(--color-primary)' }}>{t.landing.heroHighlight}</span>
        </h1>

        <p
          className="mx-auto mt-3 sm:mt-4 md:mt-6 max-w-2xl text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed"
          style={{ color: 'var(--color-muted)' }}
        >
          {t.landing.heroSubtitle}
        </p>

        <div className="mt-6 sm:mt-8 md:mt-10 flex flex-col items-stretch sm:items-center justify-center gap-3 sm:flex-row">
          <Link to="/submit" className="btn-primary w-full sm:w-auto text-sm sm:text-base">
            {t.landing.reportIssueCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/dashboard"
            className="btn-secondary w-full sm:w-auto text-sm sm:text-base"
          >
            {t.landing.viewDashboardCta}
          </Link>
        </div>

        {/* Issue type pills */}
        <div className="mt-8 sm:mt-10 md:mt-12 flex flex-wrap justify-center gap-2 sm:gap-3">
          {issueExamples.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
            >
              <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" style={{ color }} />
              {label}
            </div>
          ))}
          <div
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            + {t.common.all}
          </div>
        </div>
      </section>

      {/* ── Live Example ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            {t.landing.liveDemoTitle}
          </h2>
          <p className="mt-2 text-xs sm:text-sm" style={{ color: 'var(--color-muted)' }}>
            {t.landing.liveDemoBadge}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Raw complaint */}
          <div
            className="rounded-xl p-4 sm:p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <div className="mb-3 sm:mb-4 flex items-center gap-2">
              <div
                className="rounded-md px-2 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
                  color: 'var(--color-muted)',
                }}
              >
                {t.landing.rawComplaintLabel}
              </div>
            </div>
            <p className="text-sm sm:text-base italic leading-relaxed" style={{ color: 'var(--color-text)' }}>
              "{t.landing.rawComplaintText}"
            </p>
          </div>

          {/* Structured result */}
          <div
            className="rounded-xl p-4 sm:p-6"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid color-mix(in srgb, var(--color-primary) 35%, transparent)' }}
          >
            <div className="mb-3 sm:mb-4 flex items-center gap-2">
              <div
                className="rounded-md px-2 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  color: 'var(--color-primary)',
                }}
              >
                {t.landing.aiInterpreting}
              </div>
            </div>
            <dl className="space-y-2 sm:space-y-3">
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <dt className="w-20 sm:w-28 shrink-0 text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)', paddingTop: '2px' }}>
                  {t.submit.assignedCategory}
                </dt>
                <dd className="text-right text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {t.landing.exampleCategory}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <dt className="w-20 sm:w-28 shrink-0 text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)', paddingTop: '2px' }}>
                  {t.submit.assignedSeverity}
                </dt>
                <dd className="text-right text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {t.landing.exampleSeverity}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <dt className="w-20 sm:w-28 shrink-0 text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)', paddingTop: '2px' }}>
                  {t.submit.assignedUrgency}
                </dt>
                <dd className="text-right text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {t.landing.exampleUrgency}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2 sm:gap-4">
                <dt className="w-20 sm:w-28 shrink-0 text-[10px] sm:text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-muted)', paddingTop: '2px' }}>
                  {t.submit.extractedSummary}
                </dt>
                <dd className="text-right text-xs sm:text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {t.landing.exampleSummary}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto mb-8 sm:mb-12 max-w-xl text-center">
          <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
            {t.landing.howItWorksTitle}
          </h2>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t.landing.howItWorksSubtitle}
          </p>
        </div>

        <ol className="relative grid gap-3 sm:gap-px sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="relative flex flex-col p-4 sm:p-6"
                style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)' }}
              >
                <div
                  className="mb-3 sm:mb-4 flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)' }}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: step.color }} aria-hidden />
                </div>
                <span
                  className="mb-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {step.label}
                </span>
                <h3 className="font-display text-sm sm:text-base font-bold" style={{ color: 'var(--color-text)' }}>
                  {step.title}
                </h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <div
                    className="absolute -right-px top-1/2 hidden h-px w-px lg:block"
                    style={{ color: 'var(--color-border)' }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── CTA strip ─────────────────────────────────────────────────────── */}
      <section
        className="mx-auto rounded-2xl p-6 sm:p-8 lg:p-12 text-center"
        style={{
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 8%, var(--color-surface)), var(--color-surface))',
          border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
        }}
      >
        <div
          className="mx-auto mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <MapPin className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'var(--color-primary-fg)' }} aria-hidden />
        </div>
        <h2 className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
          {t.landing.commonIssuesTitle}
        </h2>
        <p className="mx-auto mt-2 sm:mt-3 max-w-lg text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t.landing.commonIssuesSubtitle}
        </p>
        <Link to="/submit" className="btn-primary mt-6 sm:mt-8 inline-flex text-sm sm:text-base">
          {t.landing.reportIssueCta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
};

export default LandingPage;
