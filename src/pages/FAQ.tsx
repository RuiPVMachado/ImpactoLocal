import { HelpCircle, Users, Calendar, Shield, Mail, Globe } from "lucide-react";

const faqs = [
  {
    question: "Como posso inscrever-me como voluntário?",
    answer:
      'Basta criar uma conta gratuita, completar o seu perfil e explorar os eventos disponíveis. Quando encontrar uma oportunidade que goste, clique em "Candidatar" e aguarde a resposta da organização.',
    icon: Users,
  },
  {
    question: "Posso criar eventos enquanto organização?",
    answer:
      "Sim. Depois de validar a sua conta como organização, terá acesso à dashboard onde pode criar, editar e gerir eventos de forma simples.",
    icon: Calendar,
  },
  {
    question: "Os meus dados estão seguros?",
    answer:
      "Levamos a segurança a sério. Utilizamos autenticação segura via Supabase e apenas partilhamos os seus dados com as organizações quando se candidata a um evento.",
    icon: Shield,
  },
  {
    question: "Não encontro um evento na minha área. O que faço?",
    answer:
      "Estamos sempre a adicionar novas oportunidades. Active as notificações e siga as organizações favoritas para saber quando surgem eventos perto de si.",
    icon: Globe,
  },
  {
    question: "Como entro em contacto com a equipa ImpactoLocal?",
    answer:
      "Pode enviar-nos uma mensagem através da página de contacto ou escrever diretamente para contacto@impactolocal.pt. Respondemos em menos de 24 horas úteis.",
    icon: Mail,
  },
];

/**
 * The FAQ page component.
 * Displays frequently asked questions and answers.
 */
export default function FAQ() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm px-5 py-2 rounded-full border border-white/20">
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm font-semibold tracking-wide uppercase text-white">
                Perguntas Frequentes
              </span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Tudo o que precisa de saber
          </h1>
          <p className="text-xl text-white/90">
            Encontre respostas rápidas sobre como tirar o máximo partido da
            plataforma ImpactoLocal.
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-6">
            {faqs.map(({ question, answer, icon: Icon }) => (
              <details
                key={question}
                className="group bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden"
              >
                <summary className="flex items-center gap-4 cursor-pointer list-none px-6 py-5 transition bg-white group-open:bg-emerald-50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className="flex-1 text-lg font-semibold text-gray-900">
                    {question}
                  </span>
                  <svg
                    className="h-5 w-5 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 7L10 12L15 7"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </summary>
                <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                  {answer}
                </div>
              </details>
            ))}
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Ainda tem dúvidas?
              </h2>
              <p className="text-gray-600 mb-4">
                A nossa equipa de suporte está disponível para ajudar com
                questões técnicas, sugestões ou novas parcerias.
              </p>
              <a
                href="/contacto"
                className="inline-flex items-center justify-center gap-2 bg-brand-secondary text-white px-5 py-3 rounded-lg font-semibold transition hover:bg-brand-secondary/90"
              >
                Contactar equipa
              </a>
            </div>

            <div className="bg-brand-background border border-brand-secondary/20 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Sugira uma pergunta
              </h3>
              <p className="text-sm text-gray-700">
                Não encontrou a resposta que procurava? Envie-nos a sua pergunta
                e iremos adicioná-la a esta secção.
              </p>
              <p className="mt-3 text-sm text-gray-700">
                Email:{" "}
                <span className="font-semibold text-brand-primary">
                  contacto@impactolocal.pt
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
