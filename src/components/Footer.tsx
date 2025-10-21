import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-secondary text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <MapPin className="h-5 w-5 text-brand-primary" />
              </div>
              <span className="text-xl font-bold text-white">
                <span className="text-brand-primary">Impacto</span>
                <span>Local</span>
              </span>
            </div>
            <p className="text-sm text-white/80">
              Capacitar comunidades através de ações locais, aproximando
              voluntários e organizações que querem fazer a diferença.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Início
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Eventos
                </Link>
              </li>
              <li>
                <Link
                  to="/sobre-nos"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  to="/faq"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  to="/contacto"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Contacto
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Registar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Para Organizações</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/organization/dashboard"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/organization/events"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Gerir Eventos
                </Link>
              </li>
              <li>
                <Link
                  to="/organization/events/create"
                  className="text-sm text-white/80 transition hover:text-brand-primary"
                >
                  Criar Evento
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Contacto</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-brand-primary" />
                <span>contacto@impactolocal.pt</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-brand-primary" />
                <span>+351 123 456 789</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-brand-primary" />
                <span>Lisboa, Portugal</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-white/70 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} ImpactoLocal. Todos os direitos
              reservados.
            </p>
            <div className="flex space-x-6">
              <Link
                to="#"
                className="text-sm text-white/80 transition hover:text-brand-primary"
              >
                Política de Privacidade
              </Link>
              <Link
                to="#"
                className="text-sm text-white/80 transition hover:text-brand-primary"
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
