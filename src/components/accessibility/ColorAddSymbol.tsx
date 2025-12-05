import { useAccessibility } from "../../context/useAccessibility";

export type ColorAddBaseSymbol = "blue" | "yellow" | "red" | "white" | "black";

interface ColorAddSymbolProps {
  codes: ColorAddBaseSymbol[];
  ariaLabel?: string;
  className?: string;
  variant?: "light" | "dark";
}

const ICON_PATH = {
  light: "/coloradd-light.png",
  dark: "/coloradd-dark.png",
} as const;

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

  const resolvedVariant = variant ?? (codes.includes("black") ? "dark" : "light");
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
