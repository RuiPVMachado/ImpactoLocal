import { Link } from "react-router-dom";
import { Heart, Search, Calendar, TrendingUp } from "lucide-react";
import EventCard from "../components/EventCard";

export default function Home() {
  const featuredEvents = [
    {
      id: "1",
      title: "Limpeza de Praia",
      description:
        "Junte-se a nós para limpar a praia local e proteger o ambiente marinho. Traga luvas e sacos do lixo serão fornecidos.",
      organization: {
        id: "org1",
        name: "EcoAmigos Portugal",
      },
      organizationId: "org1",
      category: "Ambiente",
      location: {
        address: "Praia de Carcavelos, Cascais",
        lat: 38.6755,
        lng: -9.3389,
      },
      date: "2025-11-15",
      duration: "3 horas",
      volunteersNeeded: 20,
      volunteersRegistered: 18,
      status: "open" as const,
      imageUrl: null,
      createdAt: "2024-01-05T09:00:00.000Z",
      updatedAt: "2024-01-05T09:00:00.000Z",
    },
    {
      id: "2",
      title: "Apoio a Idosos",
      description:
        "Visite e converse com idosos em lares, proporcionando companhia e momentos de alegria.",
      organization: {
        id: "org2",
        name: "Coração Solidário",
      },
      organizationId: "org2",
      category: "Social",
      location: {
        address: "Lar de Idosos Santa Casa, Lisboa",
        lat: 38.7223,
        lng: -9.1393,
      },
      date: "2025-10-20",
      duration: "2 horas",
      volunteersNeeded: 10,
      volunteersRegistered: 9,
      status: "open" as const,
      imageUrl: null,
      createdAt: "2024-02-10T09:00:00.000Z",
      updatedAt: "2024-02-10T09:00:00.000Z",
    },
    {
      id: "3",
      title: "Distribuição de Alimentos",
      description:
        "Ajude a distribuir alimentos a famílias carenciadas na comunidade local.",
      organization: {
        id: "org3",
        name: "Banco Alimentar",
      },
      organizationId: "org3",
      category: "Humanitário",
      location: {
        address: "Centro Comunitário, Porto",
        lat: 41.1579,
        lng: -8.6291,
      },
      date: "2025-10-18",
      duration: "4 horas",
      volunteersNeeded: 15,
      volunteersRegistered: 14,
      status: "open" as const,
      imageUrl: null,
      createdAt: "2024-03-12T09:00:00.000Z",
      updatedAt: "2024-03-12T09:00:00.000Z",
    },
  ];

  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white py-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Conectando Voluntários a Causas que Importam
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-emerald-50">
            Encontre oportunidades de voluntariado na sua comunidade e faça a
            diferença
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-white text-emerald-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-emerald-50 transition"
            >
              Começar Agora
            </Link>
            <Link
              to="/events"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-emerald-700 transition"
            >
              Ver Eventos
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">
            Como Funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                1. Pesquise
              </h3>
              <p className="text-gray-600">
                Encontre oportunidades de voluntariado na sua área através da
                nossa plataforma
              </p>
            </div>

            <div className="text-center">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                2. Candidate-se
              </h3>
              <p className="text-gray-600">
                Inscreva-se nos eventos que despertam o seu interesse e combine
                com os seus valores
              </p>
            </div>

            <div className="text-center">
              <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                3. Faça a Diferença
              </h3>
              <p className="text-gray-600">
                Participe e contribua ativamente para causas que transformam a
                comunidade
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-emerald-600 mr-3" />
            <h2 className="text-4xl font-bold text-center text-gray-900">
              Eventos em Destaque
            </h2>
          </div>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Oportunidades populares que precisam de voluntários agora
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {featuredEvents.map((event) => (
              <Link key={event.id} to={`/events/${event.id}`}>
                <EventCard event={event} showApplyButton={false} />
              </Link>
            ))}
          </div>
          <div className="text-center">
            <Link
              to="/events"
              className="inline-block bg-emerald-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition"
            >
              Ver Todos os Eventos
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-emerald-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Pronto para Fazer a Diferença?
          </h2>
          <p className="text-xl mb-8">
            Junte-se a milhares de voluntários e organizações que estão a
            transformar comunidades
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-emerald-700 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-emerald-50 transition"
          >
            Criar Conta Gratuita
          </Link>
        </div>
      </section>
    </div>
  );
}
