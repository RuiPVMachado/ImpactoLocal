import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, Heart } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";

/**
 * The Forgot Password page component.
 * Allows users to request a password reset email.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const { resetPassword, authLoading } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = await resetPassword(email);

    if (result.success) {
      toast.success(
        "Enviámos um email com as instruções para recuperar a sua password."
      );
      setEmail("");
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Heart className="h-12 w-12 text-emerald-600" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Recuperar password
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Introduza o email associado à sua conta e enviaremos um link de
            recuperação.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? "A enviar..." : "Enviar link de recuperação"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
            <Link
              to="/login"
              className="flex items-center hover:text-emerald-600 font-semibold"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao login
            </Link>
            <Link
              to="/register"
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
