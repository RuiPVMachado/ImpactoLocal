import { Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  LogOut,
  User,
  Calendar,
  Home,
  Users,
  Settings,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Sessão terminada com sucesso");
      navigate("/");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message ?? "Não foi possível terminar a sessão");
      } else {
        toast.error("Não foi possível terminar a sessão");
      }
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                <MapPin className="h-6 w-6 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                <span className="text-emerald-600">Impacto</span>
                <span>Local</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/events"
                  className="flex items-center space-x-1 text-gray-700 hover:text-emerald-600 transition"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Eventos</span>
                </Link>

                <NotificationBell />

                {user?.type === "volunteer" && (
                  <>
                    <Link
                      to="/my-applications"
                      className="flex items-center space-x-1 text-gray-700 hover:text-emerald-600 transition"
                    >
                      <Users className="h-5 w-5" />
                      <span>Minhas Candidaturas</span>
                    </Link>
                    <Link
                      to="/profile"
                      className="flex items-center space-x-1 text-gray-700 hover:text-emerald-600 transition"
                    >
                      <User className="h-5 w-5" />
                      <span>Perfil</span>
                    </Link>
                  </>
                )}

                {user?.type === "organization" && (
                  <>
                    <Link
                      to="/organization/dashboard"
                      className="flex items-center space-x-1 text-gray-700 hover:text-emerald-600 transition"
                    >
                      <Home className="h-5 w-5" />
                      <span>Dashboard</span>
                    </Link>
                    <Link
                      to="/organization/events"
                      className="flex items-center space-x-1 text-gray-700 hover:text-emerald-600 transition"
                    >
                      <Calendar className="h-5 w-5" />
                      <span>Meus Eventos</span>
                    </Link>
                  </>
                )}

                {user?.type === "admin" && (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-1 text-gray-700 hover:text-emerald-600 transition"
                  >
                    <Settings className="h-5 w-5" />
                    <span>Admin</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-700 hover:text-red-600 transition"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-emerald-600 transition"
                >
                  Entrar
                </Link>
                <Link
                  to="/register"
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  Registar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
