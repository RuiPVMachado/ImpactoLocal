import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MapPin,
  LogOut,
  User,
  Calendar,
  CalendarCheck,
  Home,
  Settings,
  Heart,
  Lock,
  HelpCircle,
  MessageCircle,
  Layers,
  Building2,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import NotificationBell from "./NotificationBell";
import ColorAddSymbol, {
  type ColorAddBaseSymbol,
} from "./accessibility/ColorAddSymbol";

// Responsive navbar coordinating primary navigation, account menus, notifications,
// and the ColorADD badge with careful mobile animation handling.

const BRAND_COLORADD_CODES: ColorAddBaseSymbol[] = ["white", "yellow"];

const DEFAULT_MOBILE_MENU_TRANSITION_MS = 260;
const SCROLL_MOBILE_MENU_TRANSITION_MS = 480;

export default function Navbar() {
  const { user, logout, isAuthenticated, passwordResetPending } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuState, setMobileMenuState] = useState<
    "closed" | "closing" | "open"
  >("closed");
  const [mobileMenuTransitionMs, setMobileMenuTransitionMs] = useState(
    DEFAULT_MOBILE_MENU_TRANSITION_MS
  );
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const mobileMenuCloseTimeoutRef = useRef<number | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);

  const isMobileMenuVisible = mobileMenuState !== "closed";
  const isMobileMenuInteractive = mobileMenuState === "open";

  const primaryLinks = [
    { to: "/events", label: "Eventos", icon: Calendar },
    { to: "/mapa", label: "Mapa", icon: Layers },
    { to: "/organizacoes", label: "Organizações", icon: Building2 },
  ];

  const communityLinks = [
    { to: "/sobre-nos", label: "Sobre Nós", icon: Heart },
    { to: "/faq", label: "FAQ", icon: HelpCircle },
    { to: "/contacto", label: "Contacto", icon: MessageCircle },
  ];

  const accountLinks: Array<{ to: string; label: string; icon: LucideIcon }> =
    [];

  if (user?.type === "volunteer") {
    accountLinks.push(
      { to: "/my-applications", label: "Minhas Candidaturas", icon: FileText },
      { to: "/calendar", label: "Calendário", icon: CalendarCheck },
      { to: "/profile", label: "Perfil", icon: User }
    );
  }

  if (user?.type === "organization") {
    accountLinks.push(
      { to: "/profile", label: "Perfil", icon: User },
      { to: "/organization/dashboard", label: "Dashboard", icon: Home },
      { to: "/organization/events", label: "Meus Eventos", icon: Calendar }
    );
  }

  if (user?.type === "admin") {
    accountLinks.push({ to: "/admin", label: "Admin", icon: Settings });
  }

  useEffect(() => {
    if (!isMoreMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setIsMoreMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMoreMenuOpen]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAccountMenuOpen]);

  // Collapses the mobile drawer, optionally animating with different speeds.
  const closeMobileMenu = useCallback(
    (options?: { animated?: boolean; withSlowAnimation?: boolean }) => {
      const animated = options?.animated ?? true;
      const transitionDuration = options?.withSlowAnimation
        ? SCROLL_MOBILE_MENU_TRANSITION_MS
        : DEFAULT_MOBILE_MENU_TRANSITION_MS;

      setMobileMenuTransitionMs(transitionDuration);

      if (!animated) {
        if (mobileMenuCloseTimeoutRef.current !== null) {
          window.clearTimeout(mobileMenuCloseTimeoutRef.current);
          mobileMenuCloseTimeoutRef.current = null;
        }
        setMobileMenuState("closed");
        return;
      }

      setMobileMenuState((current) => {
        if (current !== "open") {
          return current;
        }

        if (mobileMenuCloseTimeoutRef.current !== null) {
          window.clearTimeout(mobileMenuCloseTimeoutRef.current);
        }

        mobileMenuCloseTimeoutRef.current = window.setTimeout(() => {
          setMobileMenuState("closed");
          mobileMenuCloseTimeoutRef.current = null;
        }, transitionDuration);

        return "closing";
      });
    },
    []
  );

  // Opens the mobile drawer, ensuring pending close timers are cleared first.
  const openMobileMenu = useCallback(() => {
    if (mobileMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(mobileMenuCloseTimeoutRef.current);
      mobileMenuCloseTimeoutRef.current = null;
    }

    setMobileMenuTransitionMs(DEFAULT_MOBILE_MENU_TRANSITION_MS);
    setMobileMenuState("open");
  }, []);

  useEffect(() => {
    return () => {
      if (mobileMenuCloseTimeoutRef.current !== null) {
        window.clearTimeout(mobileMenuCloseTimeoutRef.current);
      }
    };
  }, []);

  // Utility to close any open menu (desktop or mobile) after navigation.
  const closeMenus = (options?: { animateMobile?: boolean }) => {
    if (options?.animateMobile) {
      closeMobileMenu();
    } else {
      closeMobileMenu({ animated: false });
    }
    setIsMoreMenuOpen(false);
    setIsAccountMenuOpen(false);
  };

  // Terminates the Supabase session and resets local menu/UI state.
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sessão terminada com sucesso");
      navigate("/");
      closeMenus();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message ?? "Não foi possível terminar a sessão");
      } else {
        toast.error("Não foi possível terminar a sessão");
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateScrollReference = () => {
      lastScrollYRef.current = window.scrollY;
    };

    const handleScroll = () => {
      if (window.innerWidth >= 1024) {
        closeMobileMenu({ animated: false });
        updateScrollReference();
        return;
      }

      const currentScrollY = window.scrollY;
      const previousScrollY = lastScrollYRef.current;
      const hasScrolled = Math.abs(currentScrollY - previousScrollY) > 6;

      if (mobileMenuState === "open" && hasScrolled) {
        closeMobileMenu({ withSlowAnimation: true });
      }

      lastScrollYRef.current = currentScrollY;
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeMobileMenu({ animated: false });
      }
      updateScrollReference();
    };

    updateScrollReference();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [closeMobileMenu, mobileMenuState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    lastScrollYRef.current = window.scrollY;
  }, [mobileMenuState]);

  const mobileMenuAnimationStyles = useMemo<CSSProperties>(() => {
    const isOpen = mobileMenuState === "open";
    return {
      maxHeight: isOpen ? "1200px" : "0px",
      opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? "auto" : "none",
      transform: isOpen ? "translateY(0)" : "translateY(-12px)",
      transitionDuration: `${mobileMenuTransitionMs}ms`,
      transitionProperty: "max-height, opacity, transform",
    };
  }, [mobileMenuState, mobileMenuTransitionMs]);

  // Toggles the mobile drawer, ensuring dropdown menus collapse first.
  const handleMobileMenuToggle = useCallback(() => {
    setIsMoreMenuOpen(false);
    setIsAccountMenuOpen(false);

    if (mobileMenuState === "open") {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }, [closeMobileMenu, mobileMenuState, openMobileMenu]);

  const accountButtonLabel = user?.name?.split(" ")[0] ?? "Conta";

  return (
    <nav className="bg-brand-background/95 sticky top-0 z-50 border-b border-brand-surfaceAlt/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-3"
              onClick={closeMenus}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
                <MapPin className="h-6 w-6 text-brand-secondary" />
              </div>
              <span className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span>
                  <span className="text-brand-primary">Impacto</span>
                  <span>Local</span>
                </span>
                <ColorAddSymbol
                  codes={BRAND_COLORADD_CODES}
                  ariaLabel="Cor principal identificada em ColorADD"
                />
              </span>
            </Link>

            <div className="hidden items-center gap-2 text-sm font-semibold text-brand-neutral lg:flex">
              {primaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="inline-flex items-center gap-2 rounded-button px-3 py-2 transition hover:bg-brand-secondary/10 hover:text-brand-secondary"
                >
                  <link.icon className="h-4 w-4" />
                  <span>{link.label}</span>
                </Link>
              ))}

              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen((current) => !current);
                    setIsAccountMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-2 rounded-button px-3 py-2 transition hover:bg-brand-secondary/10 hover:text-brand-secondary"
                  aria-haspopup="true"
                  aria-expanded={isMoreMenuOpen}
                >
                  <span>Mais</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isMoreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-brand-secondary/15 bg-white py-2 shadow-soft">
                    {communityLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={closeMenus}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-neutral transition hover:bg-brand-secondary/10 hover:text-brand-secondary"
                      >
                        <link.icon className="h-4 w-4" />
                        <span>{link.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-4 text-sm font-medium text-brand-neutral lg:flex">
            {passwordResetPending ? (
              <>
                <div className="flex items-center gap-2 rounded-button bg-amber-100 px-4 py-2 text-amber-800">
                  <Lock className="h-4 w-4" />
                  <span>Atualize a password para continuar</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-button px-3 py-2 transition hover:text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </>
            ) : isAuthenticated ? (
              <>
                <NotificationBell />
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAccountMenuOpen((current) => !current);
                      setIsMoreMenuOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-button border border-brand-secondary/20 bg-white px-3 py-2 transition hover:border-brand-secondary/40 hover:text-brand-secondary"
                    aria-haspopup="true"
                    aria-expanded={isAccountMenuOpen}
                  >
                    <User className="h-4 w-4" />
                    <span>{accountButtonLabel}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {isAccountMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-brand-secondary/15 bg-white py-2 shadow-soft">
                      {accountLinks.map((link) => (
                        <Link
                          key={link.to}
                          to={link.to}
                          onClick={closeMenus}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-neutral transition hover:bg-brand-secondary/10 hover:text-brand-secondary"
                        >
                          <link.icon className="h-4 w-4" />
                          <span>{link.label}</span>
                        </Link>
                      ))}
                      <div className="mt-2 border-t border-brand-secondary/10 pt-2">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-50"
                          type="button"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sair</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="transition hover:text-brand-secondary"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="rounded-button bg-brand-primary px-5 py-2 font-semibold text-white transition hover:bg-brand-primaryHover"
                >
                  Registar
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="rounded-button border border-brand-secondary/20 bg-white/80 p-2 text-brand-neutral shadow-soft transition duration-200 hover:border-brand-secondary/40 hover:text-brand-secondary lg:hidden"
            onClick={handleMobileMenuToggle}
            aria-controls="mobile-navigation"
            aria-label={isMobileMenuInteractive ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMobileMenuInteractive}
          >
            {isMobileMenuInteractive ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {isMobileMenuVisible && (
          <div
            id="mobile-navigation"
            className="lg:hidden overflow-hidden transition-[max-height,opacity,transform]"
            style={mobileMenuAnimationStyles}
            aria-hidden={!isMobileMenuInteractive}
          >
            <div className="mt-4 rounded-3xl border border-brand-secondary/15 bg-white/95 px-4 py-6 shadow-soft backdrop-blur">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-neutral/60">
                    Explorar
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {primaryLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={closeMenus}
                        className="flex items-center justify-between rounded-2xl border border-brand-secondary/15 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-soft transition hover:border-brand-secondary/30"
                      >
                        <span className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 text-brand-secondary" />
                          {link.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-brand-neutral/60">
                    Comunidade
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    {communityLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={closeMenus}
                        className="flex items-center justify-between rounded-2xl border border-brand-secondary/15 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-soft transition hover:border-brand-secondary/30"
                      >
                        <span className="flex items-center gap-3">
                          <link.icon className="h-5 w-5 text-brand-secondary" />
                          {link.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                {passwordResetPending ? (
                  <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Atualize a password para continuar</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="rounded-button px-3 py-2 font-semibold text-amber-900 underline"
                    >
                      Sair
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {isAuthenticated ? (
                      <>
                        <div className="flex items-center justify-between rounded-2xl border border-brand-secondary/15 bg-white/90 px-4 py-3 shadow-soft">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              Notificações
                            </p>
                            <p className="text-xs text-brand-neutral/70">
                              Veja novidades e alertas
                            </p>
                          </div>
                          <NotificationBell />
                        </div>

                        {accountLinks.map((link) => (
                          <Link
                            key={link.to}
                            to={link.to}
                            onClick={closeMenus}
                            className="flex items-center justify-between rounded-2xl border border-brand-secondary/15 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-900 shadow-soft transition hover:border-brand-secondary/30"
                          >
                            <span className="flex items-center gap-3">
                              <link.icon className="h-5 w-5 text-brand-secondary" />
                              {link.label}
                            </span>
                          </Link>
                        ))}

                        <button
                          onClick={handleLogout}
                          className="flex items-center justify-center rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                        >
                          Terminar Sessão
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/login"
                          onClick={closeMenus}
                          className="flex flex-1 items-center justify-center rounded-2xl border border-brand-secondary/20 bg-white/90 px-4 py-3 text-sm font-semibold text-brand-secondary transition hover:border-brand-secondary/40"
                        >
                          Entrar
                        </Link>
                        <Link
                          to="/register"
                          onClick={closeMenus}
                          className="flex flex-1 items-center justify-center rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
                        >
                          Criar Conta Gratuita
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
