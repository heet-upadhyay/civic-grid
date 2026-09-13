import React, { useState } from 'react';
import { verifyComplaint } from '../api/complaints';
import type { Complaint, CitizenVerification } from '../types/complaint';

interface CitizenVerificationCardProps {
  complaint: Complaint;
  existingVerification?: CitizenVerification | null;
  onSuccess: (updated: Complaint, newVerification: CitizenVerification) => void;
}

export const CitizenVerificationCard: React.FC<CitizenVerificationCardProps> = ({
  complaint,
  existingVerification,
  onSuccess,
}) => {
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existingVerification) {
    const isVerified = existingVerification.result === 'Verified';
    return (
      <div className={`p-4 rounded-xl border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
        <div className="flex items-center gap-2">
          <span className="text-lg">{isVerified ? '⭐' : '⚠️'}</span>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">
              {isVerified ? 'Citizen Verification Completed' : 'Citizen Reopened Issue'}
            </h4>
            <p className="text-[11px] text-slate-400">
              Submitted on {new Date(existingVerification.timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>
        {existingVerification.feedback && (
          <p className="text-xs italic text-slate-300 mt-2 pl-7">
            &quot;{existingVerification.feedback}&quot;
          </p>
        )}
      </div>
    );
  }

  if (complaint.status !== 'Resolved') {
    return null;
  }

  const handleVerify = async (result: 'Verified' | 'Reopened') => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await verifyComplaint(complaint.id, {
        result,
        feedback: feedback.trim() || undefined,
      });
      const newVerif: CitizenVerification = {
        complaint_id: complaint.id,
        result,
        feedback: feedback.trim() || null,
        timestamp: new Date().toISOString(),
      };
      onSuccess(updated, newVerif);
    } catch (err: any) {
      setError(err?.message || 'Failed to record feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#171B3A] border border-[#2A2F5C] rounded-xl p-5 space-y-4 shadow-lg">
      <div className="flex items-center gap-2 text-amber-400">
        <span className="text-xl">🗣️</span>
        <h4 className="text-sm font-semibold text-slate-100">Citizen Satisfaction Verification</h4>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        The municipal team marked this issue as resolved. Are you satisfied with the work completed?
      </p>

      {error && (
        <div className="p-2 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-md">
          {error}
        </div>
      )}

      <div>
        <input
          type="text"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional feedback (e.g. Looks good, or Pothole not filled completely)..."
          className="w-full bg-[#0F1229] border border-[#2A2F5C] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => handleVerify('Verified')}
          disabled={submitting}
          className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
        >
          <span>👍</span> Yes, Issue Solved
        </button>

        <button
          onClick={() => handleVerify('Reopened')}
          disabled={submitting}
          className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/30"
        >
          <span>👎</span> No, Reopen Issue
        </button>
      </div>
    </div>
  );
};
