import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useTheme } from '../../theme/useTheme';
import type { Complaint } from '../../types/complaint';

interface CategoryChartProps {
  complaints: Complaint[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Roads: '#6C7BFF', Water: '#4BA9C9', Electricity: '#F5A524',
  'Waste Management': '#71A878', 'Public Transport': '#8E9AFF',
  Healthcare: '#D77A94', Education: '#B78ADE', 'Street Lighting': '#F5A524',
  Drainage: '#4BA9C9', 'Public Safety': '#FF6B5E', Other: '#9C9FC2',
};

export const CategoryChart: React.FC<CategoryChartProps> = ({ complaints }) => {
  const { isDark } = useTheme();

  const axisColor = isDark ? '#9C9FC2' : '#5C6085';
  const gridColor = isDark ? '#2A2F5C' : '#D6D8E8';
  const tooltipBg = isDark ? '#171B3A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2A2F5C' : '#D6D8E8';

  const counts: Record<string, number> = {};
  complaints.forEach((c) => {
    if (c.status === 'Rejected / Spam' || c.category === 'Spam / Invalid') return;
    counts[c.category] = (counts[c.category] ?? 0) + 1;
  });

  const data = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({ name, count }));

  if (data.length === 0) {
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
          interval={0}
          tickFormatter={(v: string) => (v.length > 10 ? v.slice(0, 10) + '…' : v)}
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
              return (
                <div 
                  className="px-3 py-2 rounded-lg shadow-xl backdrop-blur-md" 
                  style={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--color-muted)' }}>{label}</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                    {payload[0].value} <span className="font-normal opacity-70">reports</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="count"
          name="Complaints"
          radius={[4, 4, 0, 0]}
          label={false}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS['Other']} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

