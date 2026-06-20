import { Church, Heart, Target, Users } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { useLang } from "../context/LanguageContext";

export default function AboutSection() {
  const { t } = useLang();
  const { ref, inView } = useInView();

  const cards = [
    {
      icon: Target,
      title: t("Our Goal", "Lengo Letu"),
      text: t(
        "Raise KES 30,000,000 for the AIPCA Bahati Cathedral sanctuary improvements, fellowship hall expansion, ministry growth, and grounds development.",
        "Kuchangisha KES 30,000,000 kwa ajili ya uboreshaji wa patakatifu pa AIPCA Bahati Cathedral, upanuzi wa ukumbi wa ushirika, ukuzaji wa huduma, na maendeleo ya misingi."
      ),
    },
    {
      icon: Users,
      title: t("Our Community", "Jamii Yetu"),
      text: t(
        "A growing congregation of over 500 families in Bahati, Eastlands Nairobi. Together we are building a house of worship for generations to come.",
        "Mkutano unaokua wa zaidi ya familia 500 huko Bahati, Eastlands Nairobi. Kwa pamoja tunajenga nyumba ya ibada kwa vizazi vijavyo."
      ),
    },
    {
      icon: Heart,
      title: t("Give with Purpose", "Toa kwa Kusudi"),
      text: t(
        "Every contribution goes directly to the Development Fund. Honor a committee member and leave a legacy in this sacred work.",
        "Kila mchango huenda moja kwa moja kwa Mfuko wa Maendeleo. Mheshimu mjumbe wa kamati na uache urithi katika kazi hii takatifu."
      ),
    },
  ];

  return (
    <section id="about" className="scroll-mt-16 bg-white/10 backdrop-blur-sm px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-light px-4 py-1.5 text-xs font-bold text-amber-dark uppercase tracking-widest">
            <Church size={12} />
            {t("About", "Kuhusu")}
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-nobuk md:text-4xl">
            Tujenge Pamoja
          </h2>
          <p className="mt-3 text-muted">
            {t(
              "The construction of this Great House of God started in 2006. Now we unite to complete what was started with faith and determination.",
              "Ujenzi wa Nyumba hii Kuu ya Mungu ulianza mwaka 2006. Sasa tunaungana kukamilisha kilichoanazwa kwa imani na dhamira."
            )}
          </p>
        </div>

        <div ref={ref} className="grid gap-6 md:grid-cols-3">
          {cards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className={`card-hover group rounded-2xl border border-white/20 bg-white/80 backdrop-blur-md p-8 shadow-sm ${
                  inView ? "animate-slide-up" : "opacity-0"
                }`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-nobuk-muted transition-colors group-hover:bg-nobuk">
                  <Icon size={22} className="text-nobuk transition-colors group-hover:text-white" />
                </div>
                <h3 className="text-lg font-bold text-nobuk">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{card.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
