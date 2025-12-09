import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Mail, Lock } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";

/**
 * The Login page component.
 * Allows users to sign in to their account.
 */
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { login, authLoading } = useAuth();
  const navigate = useNavigate();
  const instructionsId = useId();
  const errorId = useId();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    const result = await login(email.trim(), password);
    if (result.success) {
      toast.success("Sessão iniciada com sucesso");
      navigate("/events");
    } else if (result.requiresEmailConfirmation) {
      const message =
        result.error ??
        "Confirme o seu email antes de iniciar sessão. Consulte a sua caixa de entrada.";
      toast.error(message);
      setFormError(message);
    } else if (result.error) {
      toast.error(result.error);
      setFormError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-brand-background flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white/95 border border-brand-secondary/10 rounded-3xl shadow-soft p-8 backdrop-blur-sm">
          <div className="flex justify-center mb-6">
            <div className="bg-brand-primary/15 p-3 rounded-full">
              <Heart className="h-12 w-12 text-brand-primary" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Bem-vindo de volta
          </h2>
          <p className="text-center text-brand-neutral mb-4">
            Entre para continuar a fazer a diferença
          </p>
          <p id={instructionsId} className="text-sm text-brand-neutral/80 mb-6">
            Todos os campos são obrigatórios. Utilize a tecla Tab para navegar
            entre os campos e certifique-se de que preenche ambos antes de
            submeter.
          </p>

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            aria-describedby={
              formError ? `${instructionsId} ${errorId}` : instructionsId
            }
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-brand-secondary/20 rounded-button focus:ring-2 focus:ring-brand-secondary/40 focus:border-brand-secondary/60"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-brand-secondary/20 rounded-button focus:ring-2 focus:ring-brand-secondary/40 focus:border-brand-secondary/60"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-brand-secondary/30 text-brand-secondary focus:ring-brand-secondary/40"
                />
                <span className="ml-2 text-sm text-brand-neutral">
                  Lembrar-me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-brand-secondary hover:text-brand-secondary/80"
              >
                Esqueceu a password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-brand-primary text-white py-3 rounded-button transition font-semibold hover:bg-brand-primaryHover disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? "A entrar..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-brand-neutral">
            Não tem conta?{" "}
            <Link
              to="/register"
              className="text-brand-secondary hover:text-brand-secondary/80 font-semibold"
            >
              Registe-se aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
