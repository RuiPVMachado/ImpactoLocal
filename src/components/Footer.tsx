import { Link } from "react-router-dom";
import { MapPin, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10">
                <MapPin className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="text-xl font-bold text-white">
                <span className="text-emerald-400">Impacto</span>
                <span>Local</span>
              </span>
            </div>
            <p className="text-sm text-gray-400">
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
                  className="text-sm hover:text-emerald-500 transition"
                >
                  Início
                </Link>
              </li>
              <li>
                <Link
                  to="/events"
                  className="text-sm hover:text-emerald-500 transition"
                >
                  Eventos
                </Link>
              </li>
              <li>
                <Link
                  to="/sobre-nos"
                  className="text-sm hover:text-emerald-500 transition"
                >
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-sm hover:text-emerald-500 transition"
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
                  className="text-sm hover:text-emerald-500 transition"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/organization/events"
                  className="text-sm hover:text-emerald-500 transition"
                >
                  Gerir Eventos
                </Link>
              </li>
              <li>
                <Link
                  to="/organization/events/create"
                  className="text-sm hover:text-emerald-500 transition"
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
                <Mail className="h-4 w-4 text-emerald-500" />
                <span>info@impactolocal.pt</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span>+351 123 456 789</span>
              </li>
              <li className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4 text-emerald-500" />
                <span>Lisboa, Portugal</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-gray-400 mb-4 md:mb-0">
              &copy; {new Date().getFullYear()} ImpactoLocal. Todos os direitos
              reservados.
            </p>
            <div className="flex space-x-6">
              <Link
                to="#"
                className="text-sm hover:text-emerald-500 transition"
              >
                Política de Privacidade
              </Link>
              <Link
                to="#"
                className="text-sm hover:text-emerald-500 transition"
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
