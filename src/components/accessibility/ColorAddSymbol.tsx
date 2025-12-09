// Shows ColorADD badge(s) when the accessibility setting toggles them on.
import { useAccessibility } from "../../context/useAccessibility";

export type ColorAddBaseSymbol = "blue" | "yellow" | "red" | "white" | "black";

/**
 * Props for the ColorAddSymbol component.
 */
interface ColorAddSymbolProps {
  /** The color codes to display symbols for. */
  codes: ColorAddBaseSymbol[];
  /** Accessible label for the symbol image. */
  ariaLabel?: string;
  /** Optional CSS classes. */
  className?: string;
  /** The visual variant (light or dark) for the symbol. */
  variant?: "light" | "dark";
}

const ICON_PATH = {
  light: "/coloradd-light.png",
  dark: "/coloradd-dark.png",
} as const;

/**
 * Displays ColorADD symbols for color identification assistance.
 * Only renders if the `colorAddSymbols` accessibility setting is enabled.
 */
export default function ColorAddSymbol({
  codes,
  ariaLabel = "Cor principal identificada via ColorADD",
  className,
  variant,
}: ColorAddSymbolProps) {
  const { settings } = useAccessibility();

  if (!settings.colorAddSymbols) {
    return null;
  }

  const resolvedVariant =
    variant ?? (codes.includes("black") ? "dark" : "light");
  const finalClassName = ["inline-block h-10 w-10", className]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      src={ICON_PATH[resolvedVariant]}
      alt={ariaLabel}
      className={finalClassName}
      width={40}
      height={40}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
