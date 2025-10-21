import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  MapPin,
  LogOut,
  User,
  Calendar,
  Home,
  Users,
  Settings,
  Heart,
  Lock,
  HelpCircle,
  MessageCircle,
  Layers,
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
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const primaryLinks = [
    { to: "/events", label: "Eventos", icon: Calendar },
    { to: "/mapa", label: "Mapa", icon: Layers },
    { to: "/faq", label: "FAQ", icon: HelpCircle },
  ];

  const communityLinks = [
    { to: "/sobre-nos", label: "Sobre Nós", icon: Heart },
    { to: "/contacto", label: "Contacto", icon: MessageCircle },
  ];

  const accountLinks: Array<{ to: string; label: string; icon: LucideIcon }> =
    [];

  if (user?.type === "volunteer") {
    accountLinks.push(
      { to: "/my-applications", label: "Minhas Candidaturas", icon: Users },
      { to: "/profile", label: "Perfil", icon: User }
    );
  }

  if (user?.type === "organization") {
    accountLinks.push(
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

  const closeMenus = () => {
    setIsMobileMenuOpen(false);
    setIsMoreMenuOpen(false);
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
                  onClick={() => setIsMoreMenuOpen((current) => !current)}
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
                {accountLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="inline-flex items-center gap-2 rounded-button px-3 py-2 transition hover:bg-brand-secondary/10 hover:text-brand-secondary"
                  >
                    <link.icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-button px-3 py-2 transition hover:text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
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
            className="lg:hidden rounded-button border border-brand-secondary/20 bg-white/80 p-2 text-brand-neutral shadow-soft transition hover:border-brand-secondary/40 hover:text-brand-secondary"
            onClick={() => {
              setIsMobileMenuOpen((current) => !current);
              if (isMoreMenuOpen) {
                setIsMoreMenuOpen(false);
              }
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
                <div className="flex flex-col gap-3">
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
                        className="flex items-center justify-center rounded-2xl border border-brand-secondary/20 bg-white/90 px-4 py-3 text-sm font-semibold text-brand-secondary transition hover:border-brand-secondary/40"
                      >
                        Entrar
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeMenus}
                        className="flex items-center justify-center rounded-2xl bg-brand-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-primaryHover"
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
