import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../theme/useTheme';
import type { Complaint } from '../../types/complaint';

interface SeverityChartProps {
  complaints: Complaint[];
}

const SEVERITY_CONFIG = [
  { key: 'Low', color: '#9C9FC2' },
  { key: 'Medium', color: '#F5A524' },
  { key: 'High', color: '#E46D3C' },
  { key: 'Critical', color: '#FF6B5E' },
];

export const SeverityChart: React.FC<SeverityChartProps> = ({ complaints }) => {
  const { isDark } = useTheme();
  const tooltipBg = isDark ? '#171B3A' : '#FFFFFF';
  const tooltipBorder = isDark ? '#2A2F5C' : '#D6D8E8';
  const legendColor = isDark ? '#9C9FC2' : '#5C6085';
  const strokeColor = isDark ? '#171B3A' : '#FFFFFF';

  const validComplaints = complaints.filter((c) => c.status !== 'Rejected / Spam' && c.category !== 'Spam / Invalid');
  const data = SEVERITY_CONFIG.map(({ key, color }) => ({
    name: key,
    value: validComplaints.filter((c) => c.severity === key).length,
    color,
  })).filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-muted)' }}>
        No data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={2}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0];
              return (
                <div 
                  className="px-3 py-2 rounded-lg shadow-xl backdrop-blur-md flex items-center gap-2" 
                  style={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {data.name}: <span className="font-bold">{data.value}</span>
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          iconType="circle"
          iconSize={6}
          wrapperStyle={{ fontSize: 12, color: legendColor, fontWeight: 500 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

