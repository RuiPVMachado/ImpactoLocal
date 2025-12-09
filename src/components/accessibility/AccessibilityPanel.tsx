// Floating control center for toggling color palettes, typography, and assistive options.
import { useEffect, useId, useMemo, useState } from "react";
import {
  Accessibility,
  Droplets,
  Palette,
  Headphones,
  RefreshCw,
  SunMoon,
  Type as TypeIcon,
} from "lucide-react";
import { useAccessibility } from "../../context/useAccessibility";

/**
 * Options for the color mode setting.
 */
const colorModeOptions = [
  { value: "auto", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "high-contrast", label: "Alto contraste" },
] as const;

/**
 * Options for the color palette setting, including color blindness simulations.
 */
const colorPaletteOptions = [
  {
    value: "impacto",
    label: "Original",
    description: "Paleta institucional",
  },
  {
    value: "protanopia",
    label: "Protanopia",
    description: "Tons azul/laranja seguros",
  },
  {
    value: "deuteranopia",
    label: "Deuteranopia",
    description: "Tons violeta/dourado",
  },
  {
    value: "tritanopia",
    label: "Tritanopia",
    description: "Tons coral/verde",
  },
  {
    value: "mono",
    label: "Monocromático",
    description: "Contraste neutro elevado",
  },
] as const;

const fontOptions = [
  { value: "default", label: "Inter" },
  { value: "dyslexia", label: "Atkinson Hyperlegible" },
] as const;

export default function AccessibilityPanel() {
  const {
    settings,
    resolvedColorMode,
    updateSetting,
    resetSettings,
    announce,
  } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const panelTitleId = useId();

  const handleRangeChange = (
    key: "textScale" | "lineSpacing" | "letterSpacing" | "paragraphSpacing",
    value: number,
    label: string
  ) => {
    updateSetting(key, value);
    announce(`${label} ajustado para ${value.toFixed(2)}`);
  };

  const handleToggle = (
    key: "audioDescriptions" | "captions" | "colorAddSymbols",
    label: string
  ) => {
    updateSetting(key, !settings[key]);
    announce(`${label} ${settings[key] ? "desativado" : "ativado"}`);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  const resolvedModeLabel = useMemo(() => {
    const current = colorModeOptions.find(
      (option) => option.value === resolvedColorMode
    );
    return current?.label ?? "Claro";
  }, [resolvedColorMode]);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-brand-secondary/30 bg-white px-4 py-2 text-sm font-semibold text-brand-secondary shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-secondary"
        aria-expanded={isOpen}
        aria-controls="accessibility-panel"
        aria-label={
          isOpen
            ? "Fechar painel de acessibilidade"
            : "Abrir painel de acessibilidade"
        }
        onClick={() => setIsOpen((current) => !current)}
      >
        <Accessibility className="h-4 w-4" aria-hidden="true" />
        <span>Acessibilidade</span>
      </button>

      {isOpen && (
        <section
          id="accessibility-panel"
          aria-labelledby={panelTitleId}
          aria-modal="true"
          role="dialog"
          tabIndex={-1}
          className="mt-3 flex max-h-[min(80vh,640px)] w-[min(420px,calc(100vw-2rem))] flex-col rounded-3xl border border-brand-secondary/20 bg-white p-4 shadow-2xl focus:outline-none"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-neutral/60">
                Preferências ativas
              </p>
              <h2
                id={panelTitleId}
                className="text-lg font-bold text-brand-secondary"
              >
                Centro de acessibilidade
              </h2>
              <p className="text-xs text-brand-neutral/80">
                Modo atual: {resolvedModeLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetSettings();
                announce("Preferências de acessibilidade repostas");
              }}
              className="inline-flex items-center gap-1 rounded-full border border-brand-secondary/30 px-3 py-1 text-xs font-semibold text-brand-secondary transition hover:border-brand-secondary/60"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Repor
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
            <fieldset className="rounded-2xl border border-brand-secondary/20 p-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-brand-secondary">
                <SunMoon className="h-4 w-4" aria-hidden="true" /> Modo de cor
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {colorModeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-secondary/20 px-3 py-2 text-sm font-medium text-brand-neutral hover:border-brand-secondary/50"
                  >
                    <input
                      type="radio"
                      name="color-mode"
                      value={option.value}
                      checked={settings.colorMode === option.value}
                      onChange={() => {
                        updateSetting("colorMode", option.value);
                        announce(`Modo ${option.label} ativado`);
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-brand-secondary/20 p-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-brand-secondary">
                <Droplets className="h-4 w-4" aria-hidden="true" /> Paletas
                amigas do daltonismo
              </legend>
              <div className="mt-2 space-y-2">
                {colorPaletteOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-brand-secondary/20 px-3 py-2 text-sm font-medium text-brand-neutral hover:border-brand-secondary/50"
                  >
                    <span>
                      {option.label}
                      <span className="block text-xs text-brand-neutral/70">
                        {option.description}
                      </span>
                    </span>
                    <input
                      type="radio"
                      name="color-palette"
                      value={option.value}
                      checked={settings.colorPalette === option.value}
                      onChange={() => {
                        updateSetting("colorPalette", option.value);
                        announce(`Paleta ${option.label} aplicada`);
                      }}
                    />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-brand-secondary/20 p-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-brand-secondary">
                <Palette className="h-4 w-4" aria-hidden="true" /> Código
                ColorADD
              </legend>
              <p className="mt-2 text-xs text-brand-neutral/80">
                Identifica as principais cores institucionais com os símbolos
                oficiais (Azul, Amarelo, Vermelho, Branco, Preto) e as suas
                combinações para tons como verde, laranja ou roxo.
              </p>
              <ToggleRow
                label="Mostrar símbolos ColorADD"
                description="Apresenta a legenda das cores no cabeçalho, rodapé e componentes críticos"
                active={settings.colorAddSymbols}
                onToggle={() =>
                  handleToggle("colorAddSymbols", "Símbolos ColorADD")
                }
              />
            </fieldset>

            <fieldset className="rounded-2xl border border-brand-secondary/20 p-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-brand-secondary">
                <TypeIcon className="h-4 w-4" aria-hidden="true" /> Texto e
                tipografia
              </legend>
              <label className="mt-2 block text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                Tamanho do texto ({Math.round(settings.textScale * 100)}%)
                <input
                  type="range"
                  min={0.85}
                  max={1.45}
                  step={0.05}
                  value={settings.textScale}
                  onChange={(event) =>
                    handleRangeChange(
                      "textScale",
                      Number(event.target.value),
                      "Tamanho do texto"
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                Espaçamento entre linhas ({settings.lineSpacing.toFixed(2)}x)
                <input
                  type="range"
                  min={1}
                  max={2}
                  step={0.1}
                  value={settings.lineSpacing}
                  onChange={(event) =>
                    handleRangeChange(
                      "lineSpacing",
                      Number(event.target.value),
                      "Espaçamento entre linhas"
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                Espaçamento entre letras ({settings.letterSpacing.toFixed(2)}em)
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.01}
                  value={settings.letterSpacing}
                  onChange={(event) =>
                    handleRangeChange(
                      "letterSpacing",
                      Number(event.target.value),
                      "Espaçamento entre letras"
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-brand-neutral/70">
                Espaçamento entre parágrafos (
                {settings.paragraphSpacing.toFixed(2)}rem)
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={settings.paragraphSpacing}
                  onChange={(event) =>
                    handleRangeChange(
                      "paragraphSpacing",
                      Number(event.target.value),
                      "Espaçamento entre parágrafos"
                    )
                  }
                  className="mt-1 w-full"
                />
              </label>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {fontOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-brand-secondary/20 px-3 py-2 text-sm font-medium text-brand-neutral hover:border-brand-secondary/50"
                  >
                    <input
                      type="radio"
                      name="font-style"
                      value={option.value}
                      checked={settings.fontStyle === option.value}
                      onChange={() => {
                        updateSetting("fontStyle", option.value);
                        announce(`Fonte ${option.label} selecionada`);
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-2xl border border-brand-secondary/20 p-3">
              <legend className="flex items-center gap-2 text-sm font-semibold text-brand-secondary">
                <Headphones className="h-4 w-4" aria-hidden="true" /> Multimédia
                inclusiva
              </legend>
              <ToggleRow
                label="Ativar descrições em áudio"
                description="Mostra descrições textuais dos elementos visuais relevantes"
                active={settings.audioDescriptions}
                onToggle={() =>
                  handleToggle("audioDescriptions", "Descrições em áudio")
                }
              />
              <ToggleRow
                label="Preferir legendas sempre ativas"
                description="Exibe legendas opcionais quando disponíveis"
                active={settings.captions}
                onToggle={() => handleToggle("captions", "Legendas")}
              />
            </fieldset>
          </div>
        </section>
      )}
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, description, active, onToggle }: ToggleRowProps) {
  return (
    <div className="mt-3 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-brand-secondary">{label}</p>
        <p className="text-xs text-brand-neutral/80">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        className={`flex h-6 w-11 items-center rounded-full border border-brand-secondary/30 px-1 transition ${
          active ? "bg-brand-secondary" : "bg-brand-secondary/10"
        }`}
        onClick={onToggle}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-soft transition ${
            active ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
