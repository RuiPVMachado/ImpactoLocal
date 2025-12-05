// Optional description/caption panel that can also narrate content via SpeechSynthesis.
import { useEffect, useId, useRef } from "react";
import { useAccessibility } from "../../context/useAccessibility";

interface MediaDescriptionProps {
  id?: string;
  description: string;
  captionTitle?: string;
  captionItems?: string[];
  heading?: string;
}

export default function MediaDescription({
  id,
  description,
  captionTitle = "Legenda",
  captionItems = [],
  heading = "Descrição do conteúdo visual",
}: MediaDescriptionProps) {
  const autoId = useId();
  const descriptionId = id ?? autoId;
  const { settings } = useAccessibility();
  const shouldShowPanel = settings.audioDescriptions || settings.captions;
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const synthesis = window.speechSynthesis;
    if (!settings.audioDescriptions || !synthesis) {
      synthesis?.cancel();
      return;
    }

    const segments = [heading, description];
    if (settings.captions && captionItems.length > 0) {
      segments.push(`${captionTitle}: ${captionItems.join(", ")}`);
    }

    const utterance = new SpeechSynthesisUtterance(segments.join(". "));
    utterance.lang = "pt-PT";
    utterance.rate = 1;
    utterance.pitch = 1;
    synthesis.cancel();
    synthesis.speak(utterance);
    utteranceRef.current = utterance;

    return () => {
      synthesis.cancel();
      utteranceRef.current = null;
    };
  }, [
    captionItems,
    captionTitle,
    description,
    heading,
    settings.audioDescriptions,
    settings.captions,
  ]);

  if (!shouldShowPanel) {
    return (
      <div id={descriptionId} className="sr-only">
        {heading}: {description}
      </div>
    );
  }

  return (
    <div
      id={descriptionId}
      className="mt-6 rounded-2xl border border-brand-secondary/20 bg-white/90 p-4 text-left text-sm text-brand-neutral shadow-soft"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
        {heading}
      </p>
      <p className="mt-1 text-brand-secondary">{description}</p>
      {settings.captions && captionItems.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
            {captionTitle}
          </p>
          <ul className="mt-1 list-disc pl-4 text-brand-neutral">
            {captionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
