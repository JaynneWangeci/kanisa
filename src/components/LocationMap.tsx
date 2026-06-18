import { MapPin, Navigation, ExternalLink, Church } from "lucide-react";
import { useInView } from "../hooks/useInView";

export default function LocationMap() {
  const churchName = "AIPCA Bahati Cathedral";
  const address = "Bahati, Eastlands, Nairobi, Kenya";
  const mapsQuery = encodeURIComponent("AIPCA Bahati Cathedral Nairobi");
  const googleMapsUrl = `https://www.google.com/maps/search/${mapsQuery}`;
  const wazeUrl = `https://waze.com/ul?q=${mapsQuery}`;
  const { ref, inView } = useInView();

  return (
    <section id="location" className="scroll-mt-16 bg-white/10 backdrop-blur-sm px-4 py-24 md:py-32">
      <div className="mx-auto max-w-3xl">
        <div ref={ref} className={`text-center ${inView ? "animate-slide-up" : "opacity-0"}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-light px-4 py-1.5 text-xs font-bold text-amber-dark uppercase tracking-widest">
            <MapPin size={12} />
            Location
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-nobuk md:text-4xl">
            Find Us
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            Join us at AIPCA Bahati Cathedral for the Harambee service
          </p>
        </div>

        <div className={`mt-8 overflow-hidden rounded-2xl border border-white/20 bg-white/80 backdrop-blur-md shadow-sm transition-all duration-500 ${
          inView ? "animate-slide-up" : "opacity-0"
        }`} style={{ animationDelay: "0.2s" }}>
          <div className="group relative aspect-video w-full bg-gray-100 overflow-hidden">
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="text-center">
                <Church size={32} className="mx-auto text-nobuk" />
                <p className="mt-2 text-sm font-bold text-nobuk">{churchName}</p>
              </div>
            </div>
            <iframe
              src={`https://www.google.com/maps/embed/v1/search?key=${(import.meta as any).env.VITE_GOOGLE_MAPS_KEY || ""}&q=${mapsQuery}`}
              className="h-full w-full"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="AIPCA Bahati Cathedral location"
            />
          </div>

          <div className="border-t border-gray-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nobuk-muted">
                <MapPin size={18} className="text-nobuk" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-nobuk">{churchName}</h3>
                <p className="text-sm text-muted">{address}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lift flex flex-1 items-center justify-center gap-2 rounded-full bg-nobuk px-5 py-2.5 text-sm font-bold text-white hover:bg-nobuk-light"
              >
                <Navigation size={15} />
                Google Maps
                <ExternalLink size={12} />
              </a>
              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lift flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-muted hover:border-nobuk hover:text-nobuk"
              >
                <Navigation size={15} />
                Waze
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
