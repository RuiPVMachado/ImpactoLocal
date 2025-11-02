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
        const result = await fetchEvents({ limit: 6 });
        // fetchEvents with limit returns array (legacy mode)
        const events = Array.isArray(result) ? result : result.data;
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
      <section className="relative isolate overflow-hidden bg-hero-banner bg-cover bg-center py-20 px-4 text-white sm:py-24">
        <div className="absolute inset-0 bg-brand-secondary/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-brand-background/40" />
        <div className="relative max-w-6xl mx-auto text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-6 drop-shadow-md">
            Conectando Voluntários a Causas que Importam
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl mb-10 text-brand-background/90">
            Encontre oportunidades de voluntariado na sua comunidade e faça a
            diferença
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="w-full bg-brand-primary text-white px-8 py-4 rounded-button font-semibold text-lg transition hover:bg-brand-primaryHover sm:w-auto"
            >
              Começar Agora
            </Link>
            <Link
              to="/events"
              className="w-full border-2 border-white/80 text-white px-8 py-4 rounded-button font-semibold text-lg transition hover:bg-white hover:text-brand-secondary sm:w-auto"
            >
              Ver Eventos
            </Link>
          </div>
        </div>
      </section>

      <section className="py-14 px-4 bg-white/90 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-10 sm:mb-12 text-gray-900">
            Como Funciona
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center space-y-4">
              <div className="bg-brand-secondary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-brand-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                1. Pesquise
              </h3>
              <p className="text-brand-neutral text-base">
                Encontre oportunidades de voluntariado na sua área através da
                nossa plataforma
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="bg-brand-secondary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-10 w-10 text-brand-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                2. Candidate-se
              </h3>
              <p className="text-brand-neutral text-base">
                Inscreva-se nos eventos que despertam o seu interesse e combine
                com os seus valores
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="bg-brand-secondary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="h-10 w-10 text-brand-secondary" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                3. Faça a Diferença
              </h3>
              <p className="text-brand-neutral text-base">
                Participe e contribua ativamente para causas que transformam a
                comunidade
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 px-4 bg-brand-background sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="h-8 w-8 text-brand-secondary mr-3" />
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Eventos em Destaque
            </h2>
          </div>
          <p className="text-center text-brand-neutral mb-10 text-base sm:text-lg">
            Oportunidades populares que precisam de voluntários agora
          </p>
          <div className="grid gap-6 mb-8 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
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
              className="inline-block bg-brand-primary text-white px-8 py-3 rounded-button font-semibold transition hover:bg-brand-primaryHover"
            >
              Ver Todos os Eventos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
