import React from 'react';
import { BusFront, Construction, Droplets, GraduationCap, HeartPulse, Lightbulb, ShieldAlert, Trash2, Truck, Waves, Zap } from 'lucide-react';

const categoryConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  Roads: { icon: <Construction className="w-4 h-4" />, color: 'var(--color-structure)' },
  Water: { icon: <Droplets className="w-4 h-4" />, color: '#4BA9C9' },
  Electricity: { icon: <Zap className="w-4 h-4" />, color: 'var(--color-primary)' },
  'Waste Management': { icon: <Trash2 className="w-4 h-4" />, color: '#71A878' },
  'Public Transport': { icon: <BusFront className="w-4 h-4" />, color: 'var(--color-structure)' },
  Healthcare: { icon: <HeartPulse className="w-4 h-4" />, color: '#D77A94' },
  Education: { icon: <GraduationCap className="w-4 h-4" />, color: '#B78ADE' },
  'Street Lighting': { icon: <Lightbulb className="w-4 h-4" />, color: 'var(--color-primary)' },
  Drainage: { icon: <Waves className="w-4 h-4" />, color: '#4BA9C9' },
  'Public Safety': { icon: <ShieldAlert className="w-4 h-4" />, color: 'var(--color-secondary)' },
  Other: { icon: <Truck className="w-4 h-4" />, color: 'var(--color-muted)' },
};

export const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const config = categoryConfig[category] || categoryConfig.Other;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-control)] text-sm font-semibold border" style={{ color: config.color, borderColor: `color-mix(in srgb, ${config.color} 45%, transparent)`, backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)` }}>
      {config.icon}
      {category}
    </span>
  );
};
