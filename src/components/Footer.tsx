import { Link } from 'react-router-dom';
import { Heart, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Heart className="h-6 w-6 text-emerald-500" />
              <span className="text-xl font-bold text-white">VolunteerHub</span>
            </div>
            <p className="text-sm text-gray-400">
              Conectando voluntários a causas que importam e transformando comunidades através da solidariedade.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm hover:text-emerald-500 transition">
                  Início
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-sm hover:text-emerald-500 transition">
                  Eventos
                </Link>
              </li>
              <li>
                <Link to="/sobre-nos" className="text-sm hover:text-emerald-500 transition">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm hover:text-emerald-500 transition">
                  Registar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4">Para Organizações</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/organization/dashboard" className="text-sm hover:text-emerald-500 transition">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/organization/events" className="text-sm hover:text-emerald-500 transition">
                  Gerir Eventos
                </Link>
              </li>
              <li>
                <Link to="/organization/events/create" className="text-sm hover:text-emerald-500 transition">
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
                <span>info@volunteerhub.pt</span>
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
              &copy; {new Date().getFullYear()} VolunteerHub. Todos os direitos reservados.
            </p>
            <div className="flex space-x-6">
              <Link to="#" className="text-sm hover:text-emerald-500 transition">
                Política de Privacidade
              </Link>
              <Link to="#" className="text-sm hover:text-emerald-500 transition">
                Termos de Serviço
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
