import React from 'react';
import type { ComplaintEvent } from '../types/complaint';

interface TimelineWidgetProps {
  events: ComplaintEvent[];
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; colorClass: string }> = {
  CREATED: { label: 'Issue Reported', icon: '📝', colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  STATUS_CHANGED: { label: 'Status Updated', icon: '🔄', colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  ASSIGNED: { label: 'Department Assigned', icon: '👤', colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  RESOLVED: { label: 'Resolution Submitted', icon: '✅', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  VERIFIED_SATISFIED: { label: 'Citizen Verified', icon: '⭐', colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  REOPENED_UNSATISFIED: { label: 'Issue Reopened', icon: '⚠️', colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

export const TimelineWidget: React.FC<TimelineWidgetProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="text-sm text-slate-400 italic py-4">
        No event history recorded yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#2A2F5C]">
      {events.map((evt) => {
        const config = EVENT_CONFIG[evt.event_type] || {
          label: evt.event_type.replace(/_/g, ' '),
          icon: '📌',
          colorClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
        };

        let metaObj: Record<string, any> = {};
        if (evt.metadata) {
          try {
            metaObj = typeof evt.metadata === 'string' ? JSON.parse(evt.metadata) : evt.metadata;
          } catch {
            metaObj = {};
          }
        }

        return (
          <div key={evt.id} className="relative flex items-start group">
            {/* Circle Node */}
            <div className={`absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-xs ${config.colorClass}`}>
              <span className="text-[10px]">{config.icon}</span>
            </div>

            <div className="bg-[#171B3A] border border-[#2A2F5C] rounded-lg p-3 w-full shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">{config.label}</span>
                <span className="text-[11px] text-slate-400">
                  {new Date(evt.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                <span>By: <strong className="text-slate-300">{evt.actor}</strong></span>
              </div>

              {/* Render metadata details if present */}
              {metaObj && Object.keys(metaObj).length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#2A2F5C]/50 text-xs text-slate-300 space-y-1">
                  {metaObj.department && (
                    <div><span className="text-slate-400">Department:</span> {metaObj.department}</div>
                  )}
                  {metaObj.assigned_to && (
                    <div><span className="text-slate-400">Officer:</span> {metaObj.assigned_to}</div>
                  )}
                  {metaObj.note && (
                    <div className="italic text-emerald-300/90">&quot;{metaObj.note}&quot;</div>
                  )}
                  {metaObj.feedback && (
                    <div className="italic text-amber-300/90">Feedback: &quot;{metaObj.feedback}&quot;</div>
                  )}
                  {metaObj.new_status && (
                    <div><span className="text-slate-400">New Status:</span> <span className="font-mono text-indigo-300">{metaObj.new_status}</span></div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
