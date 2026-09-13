import React, { useState } from 'react';
import { resolveComplaint } from '../api/complaints';
import type { Complaint } from '../types/complaint';

interface ResolutionModalProps {
  complaint: Complaint;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updated: Complaint) => void;
}

export const ResolutionModal: React.FC<ResolutionModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [note, setNote] = useState('');
  const [evidenceImage, setEvidenceImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim() || note.trim().length < 5) {
      setError('Resolution note must be at least 5 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const updated = await resolveComplaint(complaint.id, {
        note: note.trim(),
        evidence_image: evidenceImage.trim() || undefined,
      });
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit resolution proof.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEvidenceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#171B3A] border border-[#2A2F5C] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2A2F5C] pb-3">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <span>✅</span> Submit Resolution Proof
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl font-bold transition-colors"
          >
            &times;
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Complaint <strong className="text-indigo-300">{complaint.id}</strong> — {complaint.summary}
        </p>

        {error && (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Resolution Note / Action Taken <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Describe work completed (e.g. Repaired broken pipeline, sealed pothole with cold mix, etc.)"
              className="w-full bg-[#0F1229] border border-[#2A2F5C] rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Proof of Work Photo (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#2A2F5C] file:text-slate-200 hover:file:bg-[#2A2F5C]/80 cursor-pointer"
            />
            {evidenceImage && (
              <div className="mt-2 rounded-lg overflow-hidden border border-[#2A2F5C] max-h-40">
                <img src={evidenceImage} alt="Resolution proof preview" className="w-full object-cover" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A2F5C]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-300 hover:bg-[#2A2F5C] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-900/30"
            >
              {submitting ? 'Submitting...' : 'Mark as Resolved'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
