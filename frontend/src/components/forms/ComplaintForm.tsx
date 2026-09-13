import React from 'react';
import { AlertCircle, Mic } from 'lucide-react';
import { MapLocationPicker } from './MapLocationPicker';
import { PhotoUpload } from './PhotoUpload';
import { AIProcessingSteps } from './AIProcessingSteps';
import { VoiceInput } from '../ui/VoiceInput';
import { useSubmitComplaint } from '../../hooks/useSubmitComplaint';
import type { Complaint } from '../../types/complaint';
import { useI18n } from '../../i18n/useI18n';

const MIN_LENGTH = 10;
const MAX_LENGTH = 2000;

interface ComplaintFormProps {
  onSuccess: (complaint: Complaint) => void;
}

export const ComplaintForm: React.FC<ComplaintFormProps> = ({ onSuccess }) => {
  const { t } = useI18n();
  const [text, setText] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null);
  const [imageB64, setImageB64] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState({ text: false, location: false });
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [inputMode, setInputMode] = React.useState<'text' | 'voice'>('text');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const mutation = useSubmitComplaint();

  const textError =
    touched.text && text.length < MIN_LENGTH
      ? t.submit.validationMinLength
      : null;
  const locationError = touched.location && !location ? t.submit.locationHelp : null;
  const isValid = text.length >= MIN_LENGTH && !!location;

  // Append voice transcript into the text area
  const handleTranscript = (transcript: string) => {
    setText(transcript);
    setTouched((prev) => ({ ...prev, text: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ text: true, location: true });
    if (!isValid) return;
    setSubmitError(null);
    try {
      const result = await mutation.mutateAsync({
        text,
        location,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        image_b64: imageB64,
      });
      onSuccess(result.complaint);
    } catch {
      setSubmitError(t.submit.errorSubmit);
    }
  };

  if (mutation.isPending) {
    return <AIProcessingSteps />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>

      {/* ── Description field ──────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Label row with mode toggle */}
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="complaint-text"
            className="block text-sm font-semibold"
            style={{ color: 'var(--color-text)' }}
          >
            {t.submit.rawTextLabel} <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>

          {/* Text / Voice toggle */}
          <div
            className="flex items-center gap-0.5 rounded-lg p-0.5"
            style={{ backgroundColor: 'var(--color-elevated)', border: '1px solid var(--color-border)' }}
            role="group"
            aria-label="Input mode"
          >
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all"
              style={{
                backgroundColor: inputMode === 'text' ? 'var(--color-surface)' : 'transparent',
                color: inputMode === 'text' ? 'var(--color-text)' : 'var(--color-muted)',
                boxShadow: inputMode === 'text' ? 'var(--shadow-card)' : 'none',
              }}
              aria-pressed={inputMode === 'text'}
            >
              Type
            </button>
            <button
              type="button"
              onClick={() => setInputMode('voice')}
              className="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all"
              style={{
                backgroundColor: inputMode === 'voice' ? 'var(--color-surface)' : 'transparent',
                color: inputMode === 'voice' ? 'var(--color-primary)' : 'var(--color-muted)',
                boxShadow: inputMode === 'voice' ? 'var(--shadow-card)' : 'none',
              }}
              aria-pressed={inputMode === 'voice'}
            >
              <Mic className="h-3 w-3" />
              Voice
            </button>
          </div>
        </div>

        {/* Voice controls */}
        {inputMode === 'voice' && (
          <div
            className="rounded-xl p-4"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-surface))',
              border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
            }}
          >
            <p className="mb-3 text-xs" style={{ color: 'var(--color-muted)' }}>
              {t.submit.voiceInputHelper}
            </p>
            <VoiceInput
              onTranscript={handleTranscript}
              disabled={mutation.isPending}
            />
          </div>
        )}

        {/* Text area — always visible so user can review/edit voice input */}
        <div
          className="relative overflow-hidden rounded-xl border"
          style={{
            borderColor: textError
              ? 'var(--color-danger)'
              : isFocused
                ? 'var(--color-primary)'
                : 'var(--color-border)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <textarea
            ref={textareaRef}
            id="complaint-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setTouched((prev) => ({ ...prev, text: true }));
            }}
            placeholder={
              inputMode === 'voice'
                ? t.submit.voiceInputHelper
                : t.submit.rawTextPlaceholder
            }
            maxLength={MAX_LENGTH}
            rows={6}
            aria-required="true"
            aria-invalid={!!textError}
            aria-describedby={textError ? 'text-error' : 'text-count'}
            disabled={mutation.isPending}
            className="w-full resize-none bg-transparent px-4 py-3 text-sm focus:outline-none"
            style={{ color: 'var(--color-text)' }}
          />
          <div className="absolute bottom-3 right-4">
            <span
              id="text-count"
              className="text-xs"
              style={{
                color:
                  text.length > MAX_LENGTH * 0.9 ? 'var(--color-warning)' : 'var(--color-muted)',
              }}
            >
              {text.length} / {MAX_LENGTH}
            </span>
          </div>
        </div>

        {textError && (
          <p
            id="text-error"
            className="mt-1 flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--color-danger)' }}
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5" /> {textError}
          </p>
        )}
      </div>

      {/* ── Location ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {t.submit.locationLabel} <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: locationError ? 'var(--color-danger)' : 'var(--color-border)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <MapLocationPicker
            value={location}
            onChange={(v, lat, lng) => {
              setLocation(v);
              if (lat != null && lng != null) setCoords({ lat, lng });
              setTouched((prev) => ({ ...prev, location: true }));
            }}
            disabled={mutation.isPending}
          />
        </div>
        {locationError && (
          <p
            className="mt-1 flex items-center gap-1.5 text-xs"
            style={{ color: 'var(--color-danger)' }}
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5" /> {locationError}
          </p>
        )}
      </div>

      {/* ── Photo Evidence (Multimodal Vision) ────────────────────── */}
      <PhotoUpload onPhotoSelected={setImageB64} disabled={mutation.isPending} />

      {/* ── Submit error ───────────────────────────────────────────── */}
      {submitError && (
        <div
          className="flex items-start gap-3 rounded-xl border p-4"
          style={{
            borderColor: 'var(--color-danger)',
            backgroundColor: 'color-mix(in srgb, var(--color-danger) 8%, transparent)',
          }}
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-danger)' }} />
          <p className="text-sm" style={{ color: 'var(--color-danger)' }}>
            {submitError}
          </p>
        </div>
      )}

      <button type="submit" disabled={mutation.isPending} className="btn-primary w-full">
        {mutation.isPending ? t.submit.submittingBtn : t.submit.submitBtn}
      </button>
    </form>
  );
};
