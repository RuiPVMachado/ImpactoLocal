// Site-wide footer with navigation shortcuts, contact info, and ColorADD cues.
import { Link } from "react-router-dom";
import {
  MapPin,
  Mail,
  Phone,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import ColorAddSymbol, {
  type ColorAddBaseSymbol,
} from "./accessibility/ColorAddSymbol";

const BRAND_COLORADD_CODES: ColorAddBaseSymbol[] = ["black", "blue", "yellow"];

/**
 * The site-wide footer component.
 * Contains navigation links, contact information, social media links, and accessibility symbols.
 */
export default function Footer() {
  return (
    <footer
      className="bg-brand-secondary text-white"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">
        Ligações e contactos ImpactoLocal
      </h2>
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-14 lg:py-16">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-3">
          <div className="hidden md:block">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
              Links Rápidos
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Início
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Eventos
                </Link>
              </li>
              <li>
                <Link
                  to="/sobre-nos"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/contacto"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          <div className="hidden md:block">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
              Recursos
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  to="/politica-de-privacidade"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link
                  to="/termos-de-servico"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Termos de Serviço
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Tornar-me Voluntário
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
                >
                  Aceder à Conta
                </Link>
              </li>
            </ul>
          </div>

          <div className="border-t border-white/10 pt-8 md:border-t-0 md:pt-0">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
                Contacto
              </h3>
              <ColorAddSymbol
                codes={BRAND_COLORADD_CODES}
                ariaLabel="Cor principal do ImpactoLocal identificada em ColorADD"
                className="hidden sm:inline-flex"
                variant="dark"
              />
            </div>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3 text-white">
                <Mail className="h-4 w-4 text-white" />
                <span className="leading-relaxed">
                  contacto@impactolocal.pt
                </span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <Phone className="h-4 w-4 text-white" />
                <span className="leading-relaxed">+351 123 456 789</span>
              </li>
              <li className="flex items-start gap-3 text-white">
                <MapPin className="h-4 w-4 text-white" />
                <span className="leading-relaxed">Lisboa, Portugal</span>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3 text-white">
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

        <div className="mt-8 border-t border-white/10 pt-6 sm:mt-12 sm:pt-8">
          <div className="flex flex-col gap-4 text-center text-sm text-white sm:text-left md:flex-row md:items-center md:justify-between">
            <p>
              &copy; {new Date().getFullYear()} ImpactoLocal. Todos os direitos
              reservados.
            </p>
            <div className="flex flex-wrap justify-center gap-4 md:justify-end">
              <Link
                to="/politica-de-privacidade"
                className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
              >
                Política de Privacidade
              </Link>
              <Link
                to="/termos-de-servico"
                className="text-white transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-secondary"
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
