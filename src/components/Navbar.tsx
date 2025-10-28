import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  MapPin,
  LogOut,
  User,
  Calendar,
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

export default function Navbar() {
  const { user, logout, isAuthenticated, passwordResetPending } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isHamburgerVisible, setIsHamburgerVisible] = useState(true);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const lastScrollYRef = useRef(0);

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
      {
        to: "/my-applications",
        label: "Minhas Candidaturas",
        icon: FileText,
      },
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

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
    setIsAccountMenuOpen(false);
  };

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
        setIsHamburgerVisible(true);
        updateScrollReference();
        return;
      }

      const currentScrollY = window.scrollY;

      if (currentScrollY <= 0) {
        setIsHamburgerVisible(true);
        lastScrollYRef.current = 0;
        return;
      }

      const previousScrollY = lastScrollYRef.current;
      const isScrollingDown = currentScrollY > previousScrollY + 4;
      const isScrollingUp = currentScrollY < previousScrollY - 4;

      if (isScrollingDown) {
        setIsHamburgerVisible(false);
      } else if (isScrollingUp) {
        setIsHamburgerVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsHamburgerVisible(true);
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
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    lastScrollYRef.current = window.scrollY;
  }, [isMobileMenuOpen]);

  const accountButtonLabel = user?.name?.split(" ")[0] ?? "Conta";

  return (
    <nav className="bg-brand-background/95 sticky top-0 z-50 border-b border-brand-surfaceAlt/70 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-3"
              onClick={closeMenus}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-secondary/10">
                <MapPin className="h-6 w-6 text-brand-secondary" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                <span className="text-brand-primary">Impacto</span>
                <span>Local</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-2 text-sm font-semibold text-brand-neutral">
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

          <div className="hidden lg:flex items-center gap-4 text-sm font-medium text-brand-neutral">
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
                  className="bg-brand-primary text-white px-5 py-2 rounded-button font-semibold transition hover:bg-brand-primaryHover"
                >
                  Registar
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className={`lg:hidden rounded-button border border-brand-secondary/20 bg-white/80 p-2 text-brand-neutral shadow-soft transition hover:border-brand-secondary/40 hover:text-brand-secondary duration-200 ${
              !isHamburgerVisible
                ? "pointer-events-none opacity-0"
                : "opacity-100"
            }`}
            onClick={() => {
              setIsMobileMenuOpen((current) => !current);
              setIsHamburgerVisible(true);
              setIsMoreMenuOpen(false);
              setIsAccountMenuOpen(false);
            }}
            aria-label="Abrir menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-brand-secondary/20 py-6">
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
        )}
      </div>
    </nav>
  );
}
