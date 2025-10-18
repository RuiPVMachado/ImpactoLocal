import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, MessageCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import MapPlaceholder from "../components/MapPlaceholder";
import { submitContactMessage } from "../lib/api";

const INITIAL_FORM = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

type ContactFormState = typeof INITIAL_FORM;

export default function Contact() {
  const [formData, setFormData] = useState<ContactFormState>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await submitContactMessage(formData);
      toast.success("Mensagem enviada com sucesso!");
      setFormData(INITIAL_FORM);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a mensagem. Tente novamente.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-50">
      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Contacto</h1>
          <p className="text-xl text-emerald-50">
            Estamos aqui para ajudar. Envie-nos uma mensagem e entraremos em
            contacto o mais rápido possível.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-10">
          <div className="lg:col-span-3 space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <MessageCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Envie-nos uma mensagem
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Respondemos habitualmente em menos de 24 horas úteis.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Nome
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="O seu nome"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-semibold text-gray-700 mb-2"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="nome@exemplo.com"
                      className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-emerald-500 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Assunto <span className="text-gray-400">(opcional)</span>
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Como podemos ajudar?"
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    Mensagem
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Descreva a sua questão ou ideia"
                    rows={6}
                    className="w-full rounded-lg border border-gray-200 px-4 py-3 focus:border-emerald-500 focus:ring-emerald-500"
                    required
                    minLength={10}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Partilhe o máximo de detalhes possível para podermos ajudar
                    melhor.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                  {isSubmitting ? "A enviar..." : "Enviar mensagem"}
                </button>
              </form>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50">
                    <Mail className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                </div>
                <p className="text-gray-600 break-words">
                  <a
                    href="mailto:contacto@impactolocal.pt"
                    className="text-emerald-600 font-semibold hover:underline"
                  >
                    contacto@impactolocal.pt
                  </a>
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50">
                    <Phone className="h-5 w-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Telefone
                  </h3>
                </div>
                <p className="text-gray-600">+351 123 456 789</p>
                <p className="text-xs text-gray-400 mt-2">
                  Segunda a Sexta · 09h às 18h (horário de Lisboa)
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <MapPin className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Onde estamos
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Visite-nos com hora marcada para conhecer a equipa.
                  </p>
                </div>
              </div>

              <MapPlaceholder address="Av. da Liberdade 100, 1250-145 Lisboa" />

              <div className="mt-6 space-y-4 text-sm text-gray-600">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-emerald-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Horário</p>
                    <p>Segunda a Sexta: 09h00 - 18h00</p>
                    <p>Sábado: 10h00 - 13h00 (por marcação)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-emerald-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">Sugestões</p>
                    <p>
                      Tem ideias para melhorar a ImpactoLocal? Adoramos ouvir a
                      comunidade!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
