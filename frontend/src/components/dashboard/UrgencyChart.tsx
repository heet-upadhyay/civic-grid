import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from '../../theme/useTheme';
import type { Complaint } from '../../types/complaint';

interface UrgencyChartProps {
  complaints: Complaint[];
}

const URGENCY_CONFIG = [
  { key: 'Routine', color: '#9C9FC2' },
  { key: 'Soon', color: '#F5A524' },
  { key: 'Urgent', color: '#E46D3C' },
  { key: 'Emergency', color: '#FF6B5E' },
];

export const UrgencyChart: React.FC<UrgencyChartProps> = ({ complaints }) => {
  const { isDark } = useTheme();
  
  const axisColor = isDark ? '#9C9FC2' : '#5C6085';
  const gridColor = isDark ? '#2A2F5C' : '#D6D8E8';
  const tooltipBg = isDark ? '#171B3A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2A2F5C' : '#D6D8E8';

  const validComplaints = complaints.filter((c) => c.status !== 'Rejected / Spam' && c.category !== 'Spam / Invalid');
  const data = URGENCY_CONFIG.map(({ key, color }) => ({
    name: key,
    value: validComplaints.filter((c) => c.urgency === key).length,
    color,
  }));

  if (data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-muted)' }}>
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} opacity={0.5} />
        <XAxis
          dataKey="name"
          tick={{ fill: axisColor, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: axisColor, fontSize: 11, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              const item = data.find(d => d.name === label);
              return (
                <div 
                  className="px-3 py-2 rounded-lg shadow-xl backdrop-blur-md" 
                  style={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
                >
                  <p className="text-xs font-semibold mb-1 flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item?.color }}></span>
                    {label}
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {payload[0].value} <span className="font-normal opacity-70">reports</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="value" name="Complaints" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

