import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { MapPin, Loader2, Search, Navigation } from 'lucide-react';
import { INDIA_CENTER, LOCATION_PICKER_ZOOM } from '../../utils/constants';
import { useI18n } from '../../i18n/useI18n';

const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

interface MapLocationPickerProps {
  value: string;
  onChange: (location: string, lat?: number, lng?: number) => void;
  disabled?: boolean;
}

/** Places search input using AutocompleteService with Geocoder fallback & real-time typing sync */
function PlacesSearchInput({
  value,
  onSelectAddress,
  disabled,
}: {
  value: string;
  onSelectAddress: (address: string, lat?: number, lng?: number) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState(value || '');
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const placesLib = useMapsLibrary('places');
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Sync internal search query state whenever external value changes (e.g., map click or GPS)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (placesLib && !serviceRef.current) {
      try {
        serviceRef.current = new placesLib.AutocompleteService();
      } catch {
        serviceRef.current = null;
      }
    }
  }, [placesLib]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = (inputVal: string) => {
    if (!inputVal.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    if (serviceRef.current) {
      serviceRef.current.getPlacePredictions(
        { input: inputVal, componentRestrictions: { country: 'in' } },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
            setPredictions(results);
            setIsOpen(true);
          } else {
            // Retry without strict country restriction if no India-specific results match
            serviceRef.current?.getPlacePredictions({ input: inputVal }, (globalResults, globalStatus) => {
              if (globalStatus === google.maps.places.PlacesServiceStatus.OK && globalResults && globalResults.length > 0) {
                setPredictions(globalResults);
                setIsOpen(true);
              } else {
                fallbackGeocoderSearch(inputVal);
              }
            });
          }
        },
      );
    } else {
      fallbackGeocoderSearch(inputVal);
    }
  };

  const fallbackGeocoderSearch = (inputVal: string) => {
    if (typeof google !== 'undefined' && google.maps?.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: inputVal, componentRestrictions: { country: 'IN' } }, (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const mockPredictions = results.map((res) => ({
            description: res.formatted_address,
            place_id: res.place_id,
            matched_substrings: [],
            structured_formatting: { main_text: res.formatted_address, secondary_text: '' },
            terms: [],
            types: [],
          })) as unknown as google.maps.places.AutocompletePrediction[];
          setPredictions(mockPredictions);
          setIsOpen(true);
        } else {
          setPredictions([]);
          setIsOpen(false);
        }
      });
    } else {
      setPredictions([]);
      setIsOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    // Real-time sync: inform parent component immediately as user types
    onSelectAddress(val);
    fetchPredictions(val);
  };

  const handleSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    const address = prediction.description;
    setQuery(address);
    setIsOpen(false);

    if (typeof google !== 'undefined' && google.maps?.Geocoder) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          onSelectAddress(results[0].formatted_address || address, loc.lat(), loc.lng());
        } else {
          onSelectAddress(address);
        }
      });
    } else {
      onSelectAddress(address);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (predictions.length > 0) {
        handleSelect(predictions[0]);
      } else if (query.trim() && typeof google !== 'undefined' && google.maps?.Geocoder) {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: query }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = results[0].geometry.location;
            onSelectAddress(results[0].formatted_address || query, loc.lat(), loc.lng());
          }
        });
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
          style={{ color: 'var(--color-muted)' }}
        />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (predictions.length > 0) setIsOpen(true);
            else if (query.trim()) fetchPredictions(query);
          }}
          placeholder={t.location.searchPlaceholder}
          disabled={disabled}
          className="w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm transition-colors focus:outline-none"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        />
      </div>

      {isOpen && predictions.length > 0 && (
        <ul
          className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border shadow-lg"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
          }}
        >
          {predictions.map((p) => (
            <li
              key={p.place_id}
              onClick={() => handleSelect(p)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: 'var(--color-text)' }}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
              <span>{p.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Handles map click to drop a pin */
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (data: LocationData) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const listener = map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();

      try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        const address = response.results[0]?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onLocationSelect({ address, lat, lng });
      } catch {
        onLocationSelect({ address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, onLocationSelect]);

  return null;
}

/** Center map on a position */
function CenterMap({ position }: { position: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !position) return;
    map.panTo(position);
    map.setZoom(LOCATION_PICKER_ZOOM);
  }, [map, position]);
  return null;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onChange,
  disabled,
}) => {
  const { t } = useI18n();
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [centerTarget, setCenterTarget] = useState<{ lat: number; lng: number } | null>(null);

  const handleLocationSelect = useCallback(
    (data: LocationData) => {
      setMarkerPos({ lat: data.lat, lng: data.lng });
      onChange(data.address, data.lat, data.lng);
    },
    [onChange],
  );

  const handleSelectAddress = useCallback(
    (address: string, lat?: number, lng?: number) => {
      if (lat != null && lng != null) {
        setMarkerPos({ lat, lng });
        setCenterTarget({ lat, lng });
      }
      onChange(address, lat, lng);
    },
    [onChange],
  );

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError(t.location.geoNotSupported);
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const geocoder = new google.maps.Geocoder();
          const response = await geocoder.geocode({ location: { lat, lng } });
          const address = response.results[0]?.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setMarkerPos({ lat, lng });
          setCenterTarget({ lat, lng });
          onChange(address, lat, lng);
        } catch {
          setMarkerPos({ lat, lng });
          setCenterTarget({ lat, lng });
          onChange(`${lat.toFixed(4)}, ${lng.toFixed(4)}`, lat, lng);
        }
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setGeoError(t.location.geoError);
      },
      { timeout: 8000 },
    );
  }, [onChange, t.location.geoNotSupported, t.location.geoError]);

  if (!MAPS_API_KEY) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg p-6"
        style={{ backgroundColor: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
      >
        <MapPin className="h-6 w-6" style={{ color: 'var(--color-muted)' }} />
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t.location.notConfigured}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search + GPS button */}
      <div className="flex gap-2">
        <PlacesSearchInput value={value} onSelectAddress={handleSelectAddress} disabled={disabled} />
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={disabled || geoLoading}
          title={t.location.useCurrentLocation}
          aria-label={t.location.useCurrentLocation}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-muted)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t.location.myLocation}</span>
        </button>
      </div>

      {/* Map */}
      <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border)' }}>
        <Map
          defaultCenter={INDIA_CENTER}
          defaultZoom={5}
          mapId="DEMO_MAP_ID"
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          style={{ width: '100%', height: 260 }}
        >
          {markerPos && (
            <AdvancedMarker position={markerPos}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    backgroundColor: 'var(--color-primary, #6366f1)',
                    border: '2px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.15)',
                    marginTop: 2,
                  }}
                />
              </div>
            </AdvancedMarker>
          )}

          <MapClickHandler onLocationSelect={handleLocationSelect} />
          <CenterMap position={centerTarget} />
        </Map>
      </div>

      {/* Selected location display */}
      {value && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
          }}
        >
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} />
          <p className="text-xs" style={{ color: 'var(--color-text)' }}>{value}</p>
        </div>
      )}

      {/* Hint */}
      {!value && (
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {t.location.hint}
        </p>
      )}

      {geoError && (
        <p className="text-xs" style={{ color: 'var(--color-warning)' }} role="alert">
          {geoError}
        </p>
      )}
    </div>
  );
};
