import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, LockKeyhole } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/useAuth";

/**
 * ResetPassword page component.
 *
 * Allows users to set a new password after clicking a recovery link.
 * Verifies the recovery session and handles password updates.
 *
 * @returns {JSX.Element} The rendered ResetPassword page.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, authLoading, completePasswordReset } = useAuth();

  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;

    const verifySession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active) return;
        setSessionValid(!!session);
      } catch (error) {
        console.error("Failed to verify recovery session", error);
        if (active) {
          setSessionValid(false);
        }
      } finally {
        if (active) {
          setSessionChecked(true);
        }
      }
    };

    void verifySession();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("A password deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As passwords não coincidem.");
      return;
    }

    const result = await updatePassword(password);

    if (result.success) {
      completePasswordReset();
      toast.success("Password atualizada com sucesso.");
      navigate("/events");
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600 font-semibold">A validar sessão...</div>
      </div>
    );
  }

  if (!sessionValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <LockKeyhole className="h-12 w-12 text-emerald-600 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">
            Link de recuperação inválido ou expirado
          </h2>
          <p className="text-gray-600">
            Solicite um novo link para redefinir a sua password.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition font-semibold"
          >
            Pedir novo link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Lock className="h-12 w-12 text-emerald-600" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Definir nova password
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Escolha uma nova password para a sua conta e mantenha-a segura.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? "A guardar..." : "Atualizar password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
