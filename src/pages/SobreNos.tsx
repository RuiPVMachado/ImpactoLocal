import { Heart, Target, Users, Award, Sparkles, Globe } from "lucide-react";

/**
 * SobreNos page component.
 *
 * Displays information about the "Impacto Local" platform, its mission, and values.
 * Static informational page.
 *
 * @returns {JSX.Element} The rendered SobreNos page.
 */
export default function SobreNos() {
  return (
    <div className="min-h-screen bg-brand-background">
      <section className="py-16 px-4 bg-brand-secondary text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Sobre Nós</h1>
          <p className="text-xl text-white">
            Conectamos pessoas que querem fazer a diferença com causas que
            precisam de ajuda
          </p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-soft p-8 mb-12 border border-brand-secondary/10">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              A Nossa Missão
            </h2>
            <p className="text-brand-neutral text-lg leading-relaxed mb-4">
              A ImpactoLocal nasceu com o objetivo de facilitar a ligação entre
              voluntários dedicados e organizações que precisam de apoio.
              Acreditamos que todos têm algo valioso para oferecer e que,
              juntos, podemos criar um impacto positivo duradouro nas nossas
              comunidades.
            </p>
            <p className="text-brand-neutral text-lg leading-relaxed">
              A nossa plataforma foi criada para tornar o voluntariado
              acessível, transparente e gratificante para todos os envolvidos.
              Queremos inspirar mais pessoas a dedicarem o seu tempo e talento a
              causas que importam.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Os Nossos Valores
          </h2>
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-secondary/10">
              <div className="flex items-center mb-4">
                <div className="bg-brand-primary/15 p-3 rounded-2xl">
                  <Heart className="h-8 w-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 ml-4">
                  Solidariedade
                </h3>
              </div>
              <p className="text-brand-neutral">
                Promovemos a empatia e a união entre pessoas, incentivando ações
                que beneficiam a comunidade e fortalecem os laços sociais.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-secondary/10">
              <div className="flex items-center mb-4">
                <div className="bg-brand-primary/15 p-3 rounded-2xl">
                  <Target className="h-8 w-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 ml-4">
                  Impacto
                </h3>
              </div>
              <p className="text-brand-neutral">
                Focamos em criar mudanças reais e mensuráveis, garantindo que
                cada hora de voluntariado contribui para resultados concretos.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-secondary/10">
              <div className="flex items-center mb-4">
                <div className="bg-brand-primary/15 p-3 rounded-2xl">
                  <Users className="h-8 w-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 ml-4">
                  Comunidade
                </h3>
              </div>
              <p className="text-brand-neutral">
                Construímos uma rede de pessoas comprometidas com o bem comum,
                criando espaços para conexões significativas e colaboração.
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-soft p-6 border border-brand-secondary/10">
              <div className="flex items-center mb-4">
                <div className="bg-brand-primary/15 p-3 rounded-2xl">
                  <Sparkles className="h-8 w-8 text-brand-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 ml-4">
                  Transparência
                </h3>
              </div>
              <p className="text-brand-neutral">
                Garantimos clareza em todas as oportunidades, permitindo que
                voluntários e organizações tomem decisões informadas e
                conscientes.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-brand-secondary/10 bg-white/80 p-8 mb-12 shadow-soft">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              O Nosso Impacto
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-brand-primary text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-10 w-10" />
                </div>
                <div className="text-4xl font-bold text-brand-primary mb-2">
                  5.000+
                </div>
                <p className="text-brand-neutral font-semibold">
                  Voluntários Ativos
                </p>
              </div>

              <div className="text-center">
                <div className="bg-brand-primary text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Globe className="h-10 w-10" />
                </div>
                <div className="text-4xl font-bold text-brand-primary mb-2">
                  200+
                </div>
                <p className="text-brand-neutral font-semibold">
                  Organizações Parceiras
                </p>
              </div>

              <div className="text-center">
                <div className="bg-brand-primary text-white rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-10 w-10" />
                </div>
                <div className="text-4xl font-bold text-brand-primary mb-2">
                  15.000+
                </div>
                <p className="text-brand-neutral font-semibold">
                  Horas de Voluntariado
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft p-8 text-center border border-brand-secondary/10">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Junte-se a Nós
            </h2>
            <p className="text-brand-neutral text-lg mb-6">
              Seja parte desta comunidade transformadora. Cada ação conta, cada
              pessoa importa.
            </p>
            <a
              href="/register"
              className="inline-block bg-brand-primary text-white px-8 py-4 rounded-button font-semibold text-lg transition hover:bg-brand-primaryHover"
            >
              Começar Agora
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
