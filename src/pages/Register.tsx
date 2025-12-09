import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Mail, Lock, User, Building } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/useAuth";
import type { UserRole } from "../types";

/**
 * Register page component.
 *
 * Allows new users to create an account as a volunteer or organization.
 * Handles form validation, user registration via Supabase Auth, and redirection.
 *
 * @returns {JSX.Element} The rendered Register page.
 */
export default function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    type: "volunteer" as UserRole,
  });
  const { register, authLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("As passwords não coincidem");
      return;
    }
    const email = formData.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Introduza um email válido (ex.: nome@dominio.pt)");
      return;
    }

    const result = await register(
      email,
      formData.password,
      formData.name.trim(),
      formData.type
    );

    if (result.success) {
      if (result.requiresEmailConfirmation) {
        toast.success(
          "Conta criada! Verifique a sua caixa de entrada para confirmar o email antes de iniciar sessão."
        );
        navigate("/login", { replace: true });
        return;
      }

      toast.success("Conta criada com sucesso!");
      navigate("/events");
    } else if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-100 p-3 rounded-full">
              <Heart className="h-12 w-12 text-emerald-600" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
            Crie a sua conta
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Junte-se a nós e comece a fazer a diferença
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de conta
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, type: "volunteer" })
                  }
                  className={`flex items-center justify-center space-x-2 p-4 border-2 rounded-lg transition ${
                    formData.type === "volunteer"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <User className="h-5 w-5" />
                  <span className="font-semibold">Voluntário</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, type: "organization" })
                  }
                  className={`flex items-center justify-center space-x-2 p-4 border-2 rounded-lg transition ${
                    formData.type === "organization"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <Building className="h-5 w-5" />
                  <span className="font-semibold">Organização</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.type === "volunteer"
                  ? "Nome completo"
                  : "Nome da organização"}
              </label>
              <div className="relative">
                {formData.type === "volunteer" ? (
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                ) : (
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                )}
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder={
                    formData.type === "volunteer"
                      ? "João Silva"
                      : "Nome da Organização"
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
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
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
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
              {authLoading ? "A criar conta..." : "Criar conta"}
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Já tem conta?{" "}
            <Link
              to="/login"
              className="text-emerald-600 hover:text-emerald-700 font-semibold"
            >
              Entre aqui
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
