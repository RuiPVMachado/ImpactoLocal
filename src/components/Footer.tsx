import { Link } from "react-router-dom";
import {
  MapPin,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-secondary text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
              Links Rápidos
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Início
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Eventos
                </Link>
              </li>
              <li>
                <Link
                  to="/sobre-nos"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/contacto"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
              Recursos
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/politica-de-privacidade"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  to="/termos-de-servico"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Termos de Serviço
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Tornar-me Voluntário
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-white/80 transition hover:text-brand-primary"
                >
                  Aceder à Conta
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white/70">
              Contacto
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3 text-white/80">
                <Mail className="h-4 w-4 text-brand-primary" />
                <span>contacto@impactolocal.pt</span>
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <Phone className="h-4 w-4 text-brand-primary" />
                <span>+351 123 456 789</span>
              </li>
              <li className="flex items-center gap-3 text-white/80">
                <MapPin className="h-4 w-4 text-brand-primary" />
                <span>Lisboa, Portugal</span>
              </li>
            </ul>

            <div className="mt-6 flex gap-3 text-white/60">
              <a
                href="#"
                aria-label="ImpactoLocal no Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-white/60 hover:text-white"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="ImpactoLocal no Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-white/60 hover:text-white"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="ImpactoLocal no LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 transition hover:border-white/60 hover:text-white"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-white/70">
              &copy; {new Date().getFullYear()} ImpactoLocal. Todos os direitos
              reservados.
            </p>
            <div className="flex flex-wrap gap-4 text-sm text-white/70">
              <Link
                to="/politica-de-privacidade"
                className="transition hover:text-brand-primary"
              >
                Política de Privacidade
              </Link>
              <Link
                to="/termos-de-servico"
                className="transition hover:text-brand-primary"
              >
                Termos de Serviço
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
