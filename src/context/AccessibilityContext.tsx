import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

export type ColorMode = "auto" | "light" | "dark" | "high-contrast";
export type ColorPalette =
  | "impacto"
  | "protanopia"
  | "deuteranopia"
  | "tritanopia"
  | "mono";
export type FontStyle = "default" | "dyslexia";

export interface AccessibilitySettings {
  colorMode: ColorMode;
  colorPalette: ColorPalette;
  textScale: number;
  fontStyle: FontStyle;
  lineSpacing: number;
  letterSpacing: number;
  paragraphSpacing: number;
  audioDescriptions: boolean;
  captions: boolean;
}

interface AccessibilityContextValue {
  settings: AccessibilitySettings;
  resolvedColorMode: Exclude<ColorMode, "auto">;
  updateSetting: <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => void;
  resetSettings: () => void;
  announce: (message: string) => void;
  liveMessage: string;
}

const STORAGE_KEY = "impactoLocal:accessibility";

const defaultSettings: AccessibilitySettings = {
  colorMode: "auto",
  colorPalette: "impacto",
  textScale: 1,
  fontStyle: "default",
  lineSpacing: 1,
  letterSpacing: 0,
  paragraphSpacing: 1,
  audioDescriptions: false,
  captions: true,
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(
  null
);

const prefersDarkQuery = "(prefers-color-scheme: dark)";

const parseStoredSettings = () => {
  if (typeof window === "undefined") {
    return defaultSettings;
  }

  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) {
      return defaultSettings;
    }
    const parsed = JSON.parse(storedValue) as AccessibilitySettings;
    return { ...defaultSettings, ...parsed } satisfies AccessibilitySettings;
  } catch {
    return defaultSettings;
  }
};

const applyDocumentPreferences = (
  settings: AccessibilitySettings,
  resolvedColorMode: Exclude<ColorMode, "auto">
) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.colorMode = resolvedColorMode;
  root.dataset.colorPalette = settings.colorPalette;
  root.dataset.fontStyle = settings.fontStyle;
  root.style.setProperty("--text-scale", settings.textScale.toString());
  root.style.setProperty(
    "--line-height-scale",
    settings.lineSpacing.toString()
  );
  root.style.setProperty(
    "--letter-spacing",
    `${settings.letterSpacing.toFixed(3)}em`
  );
  root.style.setProperty(
    "--paragraph-spacing",
    `${settings.paragraphSpacing.toFixed(2)}rem`
  );
};

export function AccessibilityProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AccessibilitySettings>(() =>
    parseStoredSettings()
  );
  const [resolvedColorMode, setResolvedColorMode] = useState<
    Exclude<ColorMode, "auto">
  >(() => {
    if (settings.colorMode !== "auto") {
      return settings.colorMode;
    }
    if (typeof window === "undefined") {
      return "light";
    }
    return window.matchMedia(prefersDarkQuery).matches ? "dark" : "light";
  });
  const [liveMessage, setLiveMessage] = useState("");
  const announcementTimeoutRef = useRef<number>();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    applyDocumentPreferences(settings, resolvedColorMode);
  }, [settings, resolvedColorMode]);

  useEffect(() => {
    if (settings.colorMode !== "auto" || typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(prefersDarkQuery);
    const syncFromMediaQuery = (matches: boolean) => {
      setResolvedColorMode(matches ? "dark" : "light");
    };

    syncFromMediaQuery(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      syncFromMediaQuery(event.matches);
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [settings.colorMode]);

  useEffect(() => {
    if (settings.colorMode !== "auto") {
      setResolvedColorMode(settings.colorMode);
    }
  }, [settings.colorMode]);

  const updateSetting = useCallback(
    <K extends keyof AccessibilitySettings>(
      key: K,
      value: AccessibilitySettings[K]
    ) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setResolvedColorMode(() => {
      if (defaultSettings.colorMode !== "auto") {
        return defaultSettings.colorMode;
      }
      if (typeof window !== "undefined") {
        return window.matchMedia(prefersDarkQuery).matches ? "dark" : "light";
      }
      return "light";
    });
  }, []);

  const announce = useCallback((message: string) => {
    setLiveMessage(message);
    if (announcementTimeoutRef.current) {
      window.clearTimeout(announcementTimeoutRef.current);
    }
    announcementTimeoutRef.current = window.setTimeout(() => {
      setLiveMessage("");
    }, 1800);
  }, []);

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      settings,
      resolvedColorMode,
      updateSetting,
      resetSettings,
      announce,
      liveMessage,
    }),
    [
      announce,
      liveMessage,
      resolvedColorMode,
      resetSettings,
      settings,
      updateSetting,
    ]
  );

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAccessibilityContext = () => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      "useAccessibilityContext must be used within AccessibilityProvider"
    );
  }
  return ctx;
};
