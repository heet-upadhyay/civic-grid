import React from 'react';
import { Navigate } from 'react-router-dom';
import { ComplaintForm } from '../components/forms/ComplaintForm';
import { SubmissionSuccess } from '../components/complaints/SubmissionSuccess';
import type { Complaint } from '../types/complaint';
import { useI18n } from '../i18n/useI18n';
import { useRole } from '../context/RoleContext';

const SubmitComplaintPage: React.FC = () => {
  const [submitted, setSubmitted] = React.useState<Complaint | null>(null);
  const { t } = useI18n();
  const { user } = useRole();

  // Guard: must be logged in as a citizen (or at least authenticated)
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleReset = () => setSubmitted(null);

  return (
    <div className="mx-auto max-w-2xl">
      {submitted ? (
        <SubmissionSuccess complaint={submitted} onReset={handleReset} />
      ) : (
        <div className="space-y-8">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">{t.submit.pageTitle}</h1>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              {t.submit.pageSubtitle}
            </p>
          </div>

          <div className="surface-card p-6 sm:p-8">
            <ComplaintForm onSuccess={setSubmitted} />
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitComplaintPage;
