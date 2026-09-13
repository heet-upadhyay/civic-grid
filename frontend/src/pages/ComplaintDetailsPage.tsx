import React from 'react';
import { useParams } from 'react-router-dom';
import { useComplaint } from '../hooks/useComplaint';
import { ComplaintDetails } from '../components/complaints/ComplaintDetails';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/useI18n';

const ComplaintDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { data, isLoading, isError, refetch, error } = useComplaint(id ?? '');

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <LoadingSkeleton variant="row" />
        <LoadingSkeleton variant="chart" />
      </div>
    );
  }

  if (isError) {
    const isNotFound = (error as Error)?.message?.includes('not found');
    if (isNotFound) {
      return (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div
            className="w-12 h-12 rounded-[var(--radius-surface)] flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
          >
            <AlertCircle className="w-6 h-6" style={{ color: 'var(--color-muted)' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              {t.details.notFoundTitle}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>
              {t.details.notFoundDesc}
            </p>
          </div>
          <button
            onClick={() => navigate('/complaints')}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-[var(--radius-control)] transition-colors hover:opacity-80"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.details.backLink}
          </button>
        </div>
      );
    }
    return <ErrorState message={t.common.error} onRetry={() => refetch()} />;
  }

  if (!data) return null;

  return <ComplaintDetails complaint={data} />;
};

export default ComplaintDetailsPage;
