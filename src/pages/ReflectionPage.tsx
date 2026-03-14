import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CatSprite } from '../components/shared/CatSprite';
import { PixelButton } from '../components/shared/PixelButton';
import { exportReflectionJournal, type ReflectionSection } from '../utils/pdfExport';

type ReflectionMode = 'missed' | 'freeform' | null;
type MissedReasonKey = 'a' | 'b' | 'c' | 'd';

const MISSED_OPTIONS: {
  key: MissedReasonKey;
  label: string;
  prompt: string;
}[] = [
  {
    key: 'a',
    label: 'Underestimated how long my other tasks would take today.',
    prompt:
      'How can you better estimate task lengths in the future? What’s one step you can take to manage your time more effectively tomorrow?',
  },
  {
    key: 'b',
    label: 'I was distracted.',
    prompt:
      'What was most distracting to you? How could you minimise distractions before your next study sessions?',
  },
  {
    key: 'c',
    label: 'I was procrastinating from certain tasks.',
    prompt:
      'Why is this task difficult to start? List some people you could talk to for help, or some steps you could take to overcoming this roadblock. How could you break this task down into more manageable steps?',
  },
  {
    key: 'd',
    label: '',
    prompt: 'How could you change your approach to your study tomorrow?',
  },
];

export function ReflectionPage() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [mode, setMode] = useState<ReflectionMode>(null);
  const [missedStep, setMissedStep] = useState<'select' | 'journal'>('select');
  const [selectedReasons, setSelectedReasons] = useState<MissedReasonKey[]>([]);
  const [journalByReason, setJournalByReason] = useState<Record<MissedReasonKey, string>>({
    a: '',
    b: '',
    c: '',
    d: '',
  });
  const [customReason, setCustomReason] = useState('');
  const [freeformText, setFreeformText] = useState('');
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const toggleReason = (key: MissedReasonKey) => {
    setSelectedReasons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleChangeJournal = (key: MissedReasonKey, value: string) => {
    setJournalByReason((prev) => ({ ...prev, [key]: value }));
  };

  const hasAnyContent =
    freeformText.trim().length > 0 ||
    Object.values(journalByReason).some((text) => text.trim().length > 0);

  const handleBackHome = () => {
    if (hasAnyContent && !hasDownloaded) {
      const confirmExit = window.confirm(
        'Are you sure you want to exit without saving today’s journal entry?'
      );
      if (!confirmExit) return;
    }
    navigate('/');
  };

  const buildSections = (): ReflectionSection[] => {
    const sections: ReflectionSection[] = [];
    if (mode === 'freeform') {
      if (freeformText.trim().length > 0) {
        sections.push({
          heading: 'Freeform reflection',
          prompt: 'Write anything about how your day went.',
          response: freeformText,
        });
      }
    } else if (mode === 'missed') {
      for (const key of selectedReasons) {
        const opt = MISSED_OPTIONS.find((o) => o.key === key);
        if (!opt) continue;
        const heading =
          key === 'd'
            ? customReason.trim() || 'Other factor'
            : opt.label;
        sections.push({
          heading,
          prompt: opt.prompt,
          response: journalByReason[key],
        });
      }
    }
    return sections;
  };

  const handleDownload = () => {
    const sections = buildSections();
    if (sections.length === 0) return;
    exportReflectionJournal(today, sections);
    setHasDownloaded(true);
  };

  const canGoNextFromMissed =
    selectedReasons.length > 0 && (selectedReasons.includes('d') ? customReason.trim() !== '' : true);

  const sectionsForDownload = buildSections();

  return (
    <div className="font-body p-6 max-w-3xl mx-auto">
      <h2 className="font-pixel text-sm text-[var(--color-dark-brown)] mb-2">
        Reflection
      </h2>
      <CatSprite variant="sitting" size={64} className="mb-4" />

      {!mode && (
        <div className="space-y-4">
          <p className="text-[var(--color-brown)] text-sm">
            How would you like to reflect on today?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <PixelButton
              label="Reflect on missed tasks"
              variant="secondary"
              className="flex-1 px-6 py-3 text-sm"
              onClick={() => {
                setMode('missed');
                setMissedStep('select');
              }}
            />
            <PixelButton
              label="Freeform"
              variant="secondary"
              className="flex-1 px-6 py-3 text-sm"
              onClick={() => setMode('freeform')}
            />
          </div>
        </div>
      )}

      {mode === 'missed' && missedStep === 'select' && (
        <div className="mt-4 space-y-4">
          <p className="text-[var(--color-brown)] text-sm font-semibold">
            What were the biggest factors that prevented you from completing all of your tasks today?
          </p>
          <div className="space-y-2">
            {MISSED_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className={`flex items-start gap-2 px-3 py-2 rounded border-2 cursor-pointer ${
                  selectedReasons.includes(opt.key)
                    ? 'border-[var(--color-gold)] bg-[var(--color-beige)]'
                    : 'border-[var(--color-brown)] bg-[var(--color-cream)]'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedReasons.includes(opt.key)}
                  onChange={() => toggleReason(opt.key)}
                  className="mt-1"
                />
                <div className="flex-1">
                  {opt.key === 'd' ? (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Something else (write your own reason)"
                      className="w-full px-2 py-1 border border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] text-sm"
                    />
                  ) : (
                    <p className="text-sm text-[var(--color-dark-brown)]">{opt.label}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between gap-3 mt-4">
            <PixelButton
              label="Back"
              variant="ghost"
              className="px-4 py-2 text-xs"
              onClick={() => setMode(null)}
            />
            <PixelButton
              label="Next"
              variant="primary"
              className="px-6 py-3 text-sm"
              onClick={() => setMissedStep('journal')}
              disabled={!canGoNextFromMissed}
            />
          </div>
        </div>
      )}

      {mode === 'missed' && missedStep === 'journal' && (
        <div className="mt-4 space-y-6">
          {selectedReasons.map((key) => {
            const opt = MISSED_OPTIONS.find((o) => o.key === key)!;
            const heading =
              key === 'd' ? customReason.trim() || 'Other factor' : opt.label;
            return (
              <div key={key} className="space-y-2">
                <h3 className="font-pixel text-xs text-[var(--color-dark-brown)]">
                  {heading}
                </h3>
                <p className="text-[var(--color-brown)] text-sm">{opt.prompt}</p>
                <textarea
                  className="w-full h-28 px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body text-sm"
                  value={journalByReason[key]}
                  onChange={(e) => handleChangeJournal(key, e.target.value)}
                  placeholder="Write your thoughts here..."
                />
              </div>
            );
          })}

          <div className="flex justify-between gap-3 mt-4">
            <PixelButton
              label="Back"
              variant="ghost"
              className="px-4 py-2 text-xs"
              onClick={() => setMissedStep('select')}
            />
            <PixelButton
              label="Download journal"
              variant="primary"
              className="px-6 py-3 text-sm"
              onClick={handleDownload}
              disabled={sectionsForDownload.length === 0}
            />
          </div>
        </div>
      )}

      {mode === 'freeform' && (
        <div className="mt-4 space-y-4">
          <p className="text-[var(--color-brown)] text-sm">
            Freeform journaling — write anything about how your day went.
          </p>
          <textarea
            className="w-full h-40 px-3 py-2 border-2 border-[var(--color-brown)] rounded bg-[var(--color-warm-white)] font-body text-sm"
            placeholder="Today I..."
            value={freeformText}
            onChange={(e) => setFreeformText(e.target.value)}
          />
          <div className="flex justify-between gap-3 mt-4">
            <PixelButton
              label="Back"
              variant="ghost"
              className="px-4 py-2 text-xs"
              onClick={() => setMode(null)}
            />
            <PixelButton
              label="Download journal"
              variant="primary"
              className="px-6 py-3 text-sm"
              onClick={handleDownload}
              disabled={sectionsForDownload.length === 0}
            />
          </div>
        </div>
      )}

      <div className="mt-8">
        <PixelButton
          label="Back to home"
          variant="ghost"
          onClick={handleBackHome}
        />
      </div>
    </div>
  );
}
