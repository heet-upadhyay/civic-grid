import React from 'react';
import { MapLocationPicker } from './MapLocationPicker';

interface LocationSelectorProps {
  value: string;
  onChange: (value: string, lat?: number, lng?: number) => void;
  disabled?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({ value, onChange, disabled }) => {
  return <MapLocationPicker value={value} onChange={onChange} disabled={disabled} />;
};
