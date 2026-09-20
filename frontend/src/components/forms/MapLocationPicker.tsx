import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  MapPin,
  Loader2,
  Search,
  Navigation,
} from 'lucide-react';

import {
  INDIA_CENTER,
  LOCATION_PICKER_ZOOM,
} from '../../utils/constants';

import { useI18n } from '../../i18n/useI18n';


// ======================================================
// TYPES
// ======================================================

interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

interface MapLocationPickerProps {
  value: string;
  onChange: (
    location: string,
    lat?: number,
    lng?: number
  ) => void;
  disabled?: boolean;
}


// ======================================================
// LEAFLET MARKER
// ======================================================

const markerIcon = L.divIcon({
  className: 'civicgrid-location-marker',

  html: `
    <div
      style="
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: #6366f1;
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
      "
    >
      <div
        style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 8px;
          left: 8px;
        "
      ></div>
    </div>
  `,

  iconSize: [28, 28],
  iconAnchor: [14, 28],
});


// ======================================================
// PHOTON SEARCH
// No Google API
// No Google billing
// ======================================================

async function searchLocation(query: string) {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(
        query
      )}&limit=5&lang=en`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    return data.features || [];
  } catch (error) {
    console.error(
      'Location search failed:',
      error
    );

    return [];
  }
}


// ======================================================
// PHOTON REVERSE GEOCODING
// ======================================================

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`
    );

    if (!response.ok) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    const data = await response.json();

    const properties =
      data.features?.[0]?.properties;

    if (!properties) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }

    const parts = [
      properties.name,
      properties.street,
      properties.city,
      properties.district,
      properties.state,
      properties.country,
    ].filter(Boolean);

    return (
      parts.join(', ') ||
      `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    );
  } catch (error) {
    console.error(
      'Reverse geocoding failed:',
      error
    );

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}


// ======================================================
// FORMAT PHOTON RESULT
// ======================================================

function formatPhotonAddress(
  prediction: any
): string {
  const properties =
    prediction?.properties || {};

  const parts = [
    properties.name,
    properties.street,
    properties.city,
    properties.district,
    properties.state,
  ].filter(Boolean);

  return (
    parts.join(', ') ||
    properties.country ||
    'Selected location'
  );
}


// ======================================================
// SEARCH INPUT
// ======================================================

function PlacesSearchInput({
  value,
  onSelectAddress,
  disabled,
}: {
  value: string;

  onSelectAddress: (
    address: string,
    lat?: number,
    lng?: number
  ) => void;

  disabled?: boolean;
}) {
  const { t } = useI18n();

  const [query, setQuery] =
    useState(value || '');

  const [predictions, setPredictions] =
    useState<any[]>([]);

  const [isOpen, setIsOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const debounceTimer =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );


  // Keep input synchronized with parent
  useEffect(() => {
    setQuery(value || '');
  }, [value]);


  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);


  // ==================================================
  // SEARCH
  // ==================================================

  const fetchPredictions = async (
    input: string
  ) => {
    if (!input.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);

    const results =
      await searchLocation(input);

    setPredictions(results);

    setIsOpen(results.length > 0);

    setLoading(false);
  };


  // ==================================================
  // INPUT CHANGE
  // ==================================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const val = e.target.value;

    setQuery(val);

    // Update parent text
    onSelectAddress(val);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Search after 500ms
    debounceTimer.current =
      setTimeout(() => {
        fetchPredictions(val);
      }, 500);
  };


  // ==================================================
  // SELECT RESULT
  // ==================================================

  const handleSelect = (
    prediction: any
  ) => {
    const coordinates =
      prediction?.geometry?.coordinates || [];

    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    const address =
      formatPhotonAddress(prediction);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }

    setQuery(address);

    setPredictions([]);

    setIsOpen(false);

    onSelectAddress(
      address,
      lat,
      lng
    );
  };


  // ==================================================
  // ENTER KEY
  // ==================================================

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key !== 'Enter') {
      return;
    }

    e.preventDefault();

    if (predictions.length > 0) {
      handleSelect(predictions[0]);
    }
  };


  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="relative flex-1">

      <div className="relative">

        <Search
          className="
            absolute
            left-3
            top-1/2
            -translate-y-1/2
            h-4
            w-4
          "
          style={{
            color:
              'var(--color-muted)',
          }}
        />

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (
              predictions.length > 0
            ) {
              setIsOpen(true);
            }
          }}
          placeholder={
            t.location.searchPlaceholder
          }
          disabled={disabled}
          className="
            w-full
            rounded-lg
            border
            py-2.5
            pl-10
            pr-10
            text-sm
            transition-colors
            focus:outline-none
          "
          style={{
            borderColor:
              'var(--color-border)',

            backgroundColor:
              'var(--color-surface)',

            color:
              'var(--color-text)',
          }}
        />

        {loading && (
          <Loader2
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              h-4
              w-4
              animate-spin
            "
            style={{
              color:
                'var(--color-muted)',
            }}
          />
        )}

      </div>


      {/* SEARCH RESULTS */}

      {isOpen &&
        predictions.length > 0 && (
          <ul
            className="
              absolute
              z-[1000]
              mt-1
              max-h-56
              w-full
              overflow-y-auto
              rounded-lg
              border
              shadow-lg
            "
            style={{
              backgroundColor:
                'var(--color-surface)',

              borderColor:
                'var(--color-border)',
            }}
          >

            {predictions.map(
              (
                prediction,
                index
              ) => {
                const address =
                  formatPhotonAddress(
                    prediction
                  );

                return (
                  <li
                    key={`location-${index}`}
                    onClick={() =>
                      handleSelect(
                        prediction
                      )
                    }
                    className="
                      flex
                      items-center
                      gap-2.5
                      px-3.5
                      py-2.5
                      text-xs
                      cursor-pointer
                      hover:bg-black/5
                      dark:hover:bg-white/10
                    "
                    style={{
                      color:
                        'var(--color-text)',
                    }}
                  >

                    <MapPin
                      className="
                        h-3.5
                        w-3.5
                        shrink-0
                      "
                      style={{
                        color:
                          'var(--color-primary)',
                      }}
                    />

                    <span>
                      {address}
                    </span>

                  </li>
                );
              }
            )}

          </ul>
        )}

    </div>
  );
}


// ======================================================
// MAP CLICK HANDLER
// ======================================================

function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (
    data: LocationData
  ) => void;
}) {

  useMapEvents({

    click: async (event) => {

      const lat =
        event.latlng.lat;

      const lng =
        event.latlng.lng;

      const address =
        await reverseGeocode(
          lat,
          lng
        );

      onLocationSelect({
        address,
        lat,
        lng,
      });
    },

  });

  return null;
}


// ======================================================
// CENTER MAP
// ======================================================

function CenterMap({
  position,
}: {
  position:
    | {
        lat: number;
        lng: number;
      }
    | null;
}) {

  const map = useMap();

  useEffect(() => {

    if (!position) {
      return;
    }

    map.setView(
      [
        position.lat,
        position.lng,
      ],
      LOCATION_PICKER_ZOOM,
      {
        animate: true,
      }
    );

  }, [
    map,
    position,
  ]);

  return null;
}


// ======================================================
// MAIN COMPONENT
// ======================================================

export const MapLocationPicker: React.FC<
  MapLocationPickerProps
> = ({
  value,
  onChange,
  disabled,
}) => {

  const { t } = useI18n();


  // ==================================================
  // STATE
  // ==================================================

  const [markerPos, setMarkerPos] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);

  const [geoLoading, setGeoLoading] =
    useState(false);

  const [geoError, setGeoError] =
    useState<string | null>(null);

  const [centerTarget, setCenterTarget] =
    useState<{
      lat: number;
      lng: number;
    } | null>(null);


  // ==================================================
  // LOCATION SELECTED
  // ==================================================

  const handleLocationSelect =
    useCallback(
      (data: LocationData) => {

        setMarkerPos({
          lat: data.lat,
          lng: data.lng,
        });

        setCenterTarget({
          lat: data.lat,
          lng: data.lng,
        });

        onChange(
          data.address,
          data.lat,
          data.lng
        );
      },
      [onChange]
    );


  // ==================================================
  // SEARCH RESULT SELECTED
  // ==================================================

  const handleSelectAddress =
    useCallback(
      (
        address: string,
        lat?: number,
        lng?: number
      ) => {

        if (
          lat != null &&
          lng != null
        ) {

          setMarkerPos({
            lat,
            lng,
          });

          setCenterTarget({
            lat,
            lng,
          });
        }

        onChange(
          address,
          lat,
          lng
        );
      },
      [onChange]
    );


  // ==================================================
  // CURRENT LOCATION
  // ==================================================

  const handleGeolocate =
    useCallback(() => {

      if (!navigator.geolocation) {

        setGeoError(
          t.location.geoNotSupported
        );

        return;
      }


      setGeoLoading(true);

      setGeoError(null);


      navigator.geolocation.getCurrentPosition(

        async (pos) => {

          const lat =
            pos.coords.latitude;

          const lng =
            pos.coords.longitude;


          const address =
            await reverseGeocode(
              lat,
              lng
            );


          setMarkerPos({
            lat,
            lng,
          });


          setCenterTarget({
            lat,
            lng,
          });


          onChange(
            address,
            lat,
            lng
          );


          setGeoLoading(false);
        },


        (error) => {

          console.error(
            'Geolocation error:',
            error
          );

          setGeoLoading(false);

          setGeoError(
            t.location.geoError
          );
        },


        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }

      );

    }, [
      onChange,
      t.location.geoNotSupported,
      t.location.geoError,
    ]);


  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="space-y-3">


      {/* ============================================
          SEARCH + MY LOCATION
      ============================================ */}

      <div className="flex gap-2">

        <PlacesSearchInput
          value={value}
          onSelectAddress={
            handleSelectAddress
          }
          disabled={disabled}
        />


        <button
          type="button"
          onClick={
            handleGeolocate
          }
          disabled={
            disabled ||
            geoLoading
          }
          title={
            t.location
              .useCurrentLocation
          }
          aria-label={
            t.location
              .useCurrentLocation
          }
          className="
            flex
            items-center
            gap-1.5
            rounded-lg
            border
            px-3
            py-2
            text-sm
            font-medium
            transition-colors
            disabled:opacity-50
          "
          style={{
            borderColor:
              'var(--color-border)',

            color:
              'var(--color-muted)',

            backgroundColor:
              'var(--color-surface)',
          }}
        >

          {geoLoading ? (
            <Loader2
              className="
                h-4
                w-4
                animate-spin
              "
            />
          ) : (
            <Navigation
              className="
                h-4
                w-4
              "
            />
          )}

          <span className="hidden sm:inline">
            {t.location.myLocation}
          </span>

        </button>

      </div>


      {/* ============================================
          LEAFLET MAP
      ============================================ */}

      <div
        className="
          overflow-hidden
          rounded-lg
        "
        style={{
          border:
            '1px solid var(--color-border)',
        }}
      >

        <MapContainer
          center={[
            INDIA_CENTER.lat,
            INDIA_CENTER.lng,
          ]}
          zoom={5}
          scrollWheelZoom={true}
          style={{
            width: '100%',
            height: 260,
          }}
        >

          <TileLayer
            attribution="
              &copy; OpenStreetMap contributors
            "
            url="
              https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
            "
          />


          {/* MARKER */}

          {markerPos && (
            <Marker
              position={[
                markerPos.lat,
                markerPos.lng,
              ]}
              icon={markerIcon}
            />
          )}


          {/* CLICK MAP */}

          <MapClickHandler
            onLocationSelect={
              handleLocationSelect
            }
          />


          {/* CENTER MAP */}

          <CenterMap
            position={
              centerTarget
            }
          />

        </MapContainer>

      </div>


      {/* ============================================
          SELECTED LOCATION
      ============================================ */}

      {value && (
        <div
          className="
            flex
            items-start
            gap-2
            rounded-lg
            px-3
            py-2
          "
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--color-primary) 8%, transparent)',

            border:
              '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
          }}
        >

          <MapPin
            className="
              mt-0.5
              h-3.5
              w-3.5
              shrink-0
            "
            style={{
              color:
                'var(--color-primary)',
            }}
          />


          <p
            className="text-xs"
            style={{
              color:
                'var(--color-text)',
            }}
          >
            {value}
          </p>

        </div>
      )}


      {/* ============================================
          HINT
      ============================================ */}

      {!value && (
        <p
          className="text-xs"
          style={{
            color:
              'var(--color-muted)',
          }}
        >
          {t.location.hint}
        </p>
      )}


      {/* ============================================
          GEOLOCATION ERROR
      ============================================ */}

      {geoError && (
        <p
          className="text-xs"
          style={{
            color:
              'var(--color-warning)',
          }}
          role="alert"
        >
          {geoError}
        </p>
      )}

    </div>
  );
};