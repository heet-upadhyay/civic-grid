import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { trackComplaintByIdentifier } from '../api/complaints';
import { TimelineWidget } from '../components/TimelineWidget';
import { CitizenVerificationCard } from '../components/CitizenVerificationCard';
import type { TrackingData } from '../types/complaint';

export const PublicTrackPage: React.FC = () => {
  const { token: urlToken } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [inputIdentifier, setInputIdentifier] = useState(urlToken || '');
  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchTracking = async (searchIdentifier: string) => {
    if (!searchIdentifier.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await trackComplaintByIdentifier(searchIdentifier.trim());
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'No public complaint record found for that token or complaint ID.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (urlToken) {
      setInputIdentifier(urlToken);
      fetchTracking(urlToken);
    }
  }, [urlToken]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputIdentifier.trim()) {
      navigate(`/public-tracker/${encodeURIComponent(inputIdentifier.trim())}`);
      fetchTracking(inputIdentifier.trim());
    }
  };

  const handleCopy = () => {
    if (data?.complaint?.tracking_token) {
      navigator.clipboard.writeText(data.complaint.tracking_token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper for SLA Deadline calculation
  const getSlaStatus = () => {
    if (!data?.complaint.sla_deadline) return null;
    const deadline = new Date(data.complaint.sla_deadline).getTime();
    const now = new Date().getTime();
    const diffHours = Math.round((deadline - now) / (1000 * 60 * 60));

    if (data.complaint.status === 'Resolved') {
      return { text: 'Resolved within SLA', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    }
    if (diffHours < 0) {
      return { text: `⚠️ SLA Overdue by ${Math.abs(diffHours)}h`, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30 font-bold' };
    }
    return { text: `⏱️ ${diffHours}h remaining for SLA`, color: 'text-amber-300 bg-amber-500/10 border-amber-500/30' };
  };

  const slaInfo = getSlaStatus();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="bg-[#171B3A] border border-[#2A2F5C] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔍</span>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Public Grievance Tracker</h1>
              <p className="text-xs text-slate-400">
                Track a newly filed grievance using its complaint ID or public tracking token.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={inputIdentifier}
              onChange={(e) => setInputIdentifier(e.target.value)}
              placeholder="Enter Complaint ID (COMP-2026-0001) or Tracking Token..."
              className="flex-1 bg-[#0F1229] border border-[#2A2F5C] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors shadow-lg shadow-amber-500/20"
            >
              {loading ? 'Searching...' : 'Track Status'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-center text-xs text-rose-300">
          {error}
        </div>
      )}

      {data && data.complaint && (
        <div className="space-y-6">
          {/* Status Overview Card */}
          <div className="bg-[#171B3A] border border-[#2A2F5C] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2A2F5C] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400 font-bold">{data.complaint.id}</span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-300">{data.complaint.category}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-100 mt-1">{data.complaint.summary}</h2>
              </div>

              {slaInfo && (
                <div className={`px-3 py-1.5 rounded-lg border text-xs ${slaInfo.color}`}>
                  {slaInfo.text}
                </div>
              )}
            </div>

            {/* Tracking Token Bar */}
            <div className="flex items-center justify-between bg-[#0F1229] border border-[#2A2F5C] rounded-xl p-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <span>Secret Tracking Token:</span>
                <span className="font-mono font-bold text-amber-300">{data.complaint.tracking_token || inputIdentifier}</span>
              </div>
              <button
                onClick={handleCopy}
                className="text-xs text-slate-300 hover:text-amber-400 flex items-center gap-1 font-medium transition-colors"
              >
                {copied ? '✓ Copied!' : '📋 Copy Token'}
              </button>
            </div>

            {/* Complaint Meta Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
              <div className="bg-[#0F1229]/60 p-3 rounded-lg border border-[#2A2F5C]/60">
                <div className="text-slate-400 mb-1">Status</div>
                <div className="font-semibold text-slate-200">{data.complaint.status}</div>
              </div>

              <div className="bg-[#0F1229]/60 p-3 rounded-lg border border-[#2A2F5C]/60">
                <div className="text-slate-400 mb-1">Department</div>
                <div className="font-semibold text-slate-200">{data.complaint.department || 'Pending Assignment'}</div>
              </div>

              <div className="bg-[#0F1229]/60 p-3 rounded-lg border border-[#2A2F5C]/60">
                <div className="text-slate-400 mb-1">Ward</div>
                <div className="font-semibold text-slate-200">{data.complaint.ward || 'Zone Central'}</div>
              </div>

              <div className="bg-[#0F1229]/60 p-3 rounded-lg border border-[#2A2F5C]/60">
                <div className="text-slate-400 mb-1">Assigned Officer</div>
                <div className="font-semibold text-slate-200">{data.complaint.assigned_to || 'Municipal Desk'}</div>
              </div>
            </div>

            {/* Evidence Image Preview */}
            {data.resolution?.evidence_image && (
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-emerald-300 mb-2 flex items-center gap-1.5">
                  <span>📸</span> Resolution Evidence Proof of Work
                </h4>
                <div className="rounded-xl overflow-hidden border border-emerald-500/30 max-h-64">
                  <img
                    src={data.resolution.evidence_image}
                    alt="Resolution proof"
                    className="w-full object-cover"
                  />
                </div>
                {data.resolution.note && (
                  <p className="text-xs italic text-slate-300 mt-2 bg-[#0F1229] p-3 rounded-lg border border-[#2A2F5C]">
                    &quot;{data.resolution.note}&quot;
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Citizen Verification Card */}
          <CitizenVerificationCard
            complaint={data.complaint}
            existingVerification={data.verification}
            onSuccess={(updated, newVerif) => {
              setData((prev) => prev ? { ...prev, complaint: updated, verification: newVerif } : null);
            }}
          />

          {/* Timeline Audit History */}
          <div className="bg-[#171B3A] border border-[#2A2F5C] rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>📜</span> Activity Audit Trail & Milestones
            </h3>
            <TimelineWidget events={data.events || []} />
          </div>
        </div>
      )}
    </div>
  );
};
