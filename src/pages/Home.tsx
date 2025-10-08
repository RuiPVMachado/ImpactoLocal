import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Search, Calendar, TrendingUp } from "lucide-react";
import EventCard from "../components/EventCard";
import { fetchEvents } from "../lib/api";
import type { Event } from "../types";

export default function Home() {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadFeaturedEvents = async () => {
      try {
        setEventsError(null);
        const events = await fetchEvents({ limit: 6 });
        if (active) {
          setFeaturedEvents(events);
        }
      } catch (error) {
        console.error("Failed to load featured events", error);
        if (active) {
          setEventsError(
            "Não foi possível carregar os eventos em destaque neste momento."
          );
        }
      } finally {
        if (active) {
          setLoadingEvents(false);
        }
      }
    };

    void loadFeaturedEvents();

    return () => {
      active = false;
    };
  }, []);

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
            {loadingEvents ? (
              <div className="col-span-full text-center text-gray-500">
                A carregar eventos em destaque...
              </div>
            ) : eventsError ? (
              <div className="col-span-full text-center text-gray-500">
                {eventsError}
              </div>
            ) : featuredEvents.length > 0 ? (
              featuredEvents.map((event) => (
                <Link key={event.id} to={`/events/${event.id}`}>
                  <EventCard event={event} showApplyButton={false} />
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-500">
                Ainda não existem eventos disponíveis. Volte em breve!
              </div>
            )}
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
