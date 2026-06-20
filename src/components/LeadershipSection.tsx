import { useEffect, useState } from "react";
import { Church, Medal, Heart, Users } from "lucide-react";
import { useInView } from "../hooks/useInView";
import { fetchCouncils, getCouncilLabel } from "../lib/councils";

interface Member {
  id: string;
  name: string;
  role: string;
  council: string;
  photo_url: string | null;
}

const seedMembers: Member[] = [
  { id: "1", name: "Dadson Mbogo", role: "Maranatha Fellowship Chairman", council: "maranatha_fellowship", photo_url: null },
  { id: "2", name: "Jeremiah Kimani", role: "V Chairman", council: "maranatha_fellowship", photo_url: null },
  { id: "3", name: "Kariuki Nderitu", role: "General Secretary", council: "maranatha_fellowship", photo_url: null },
  { id: "4", name: "Joseph Kamande", role: "Vice General Secretary", council: "maranatha_fellowship", photo_url: null },
  { id: "5", name: "Johnson Kamau", role: "Treasurer", council: "maranatha_fellowship", photo_url: null },
  { id: "6", name: "George Kibia", role: "Vice Treasurer", council: "maranatha_fellowship", photo_url: null },
  { id: "7", name: "Magdalene Wageni", role: "Chairlady", council: "bethlehem_fellowship", photo_url: null },
  { id: "8", name: "Alice Kuhunya", role: "V Chairlady", council: "bethlehem_fellowship", photo_url: null },
  { id: "9", name: "Tiffany Kimani", role: "Secretary", council: "bethlehem_fellowship", photo_url: null },
  { id: "10", name: "Esther Mbugua", role: "Treasurer", council: "bethlehem_fellowship", photo_url: null },
  { id: "11", name: "Gilbert Wachira", role: "Chairman", council: "jerusalem_fellowship", photo_url: null },
  { id: "12", name: "Sam Ndiang'ui", role: "Chairman", council: "aefeso_fellowship", photo_url: null },
  { id: "13", name: "Wilson Thirikwa", role: "Secretary", council: "aefeso_fellowship", photo_url: null },
  { id: "14", name: "Maria goretti Njenga", role: "Treasurer", council: "aefeso_fellowship", photo_url: null },
];

const defaultCouncilLabels: Record<string, { label: string; icon: typeof Church; color: string }> = {
  maranatha_fellowship: { label: "Maranatha Fellowship", icon: Church, color: "bg-nobuk-muted text-nobuk" },
  bethlehem_fellowship: { label: "Bethlehem Fellowship", icon: Users, color: "bg-amber/20 text-amber-dark" },
  jerusalem_fellowship: { label: "Jerusalem Fellowship", icon: Users, color: "bg-gray-200 text-muted" },
  aefeso_fellowship: { label: "Aefeso Fellowship", icon: Medal, color: "bg-amber-light text-amber-dark" },
};

const colorCycle = [Church, Users, Medal, Church, Users, Medal, Church, Users];

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function LeadershipSection() {
  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [councils, setCouncils] = useState<{ slug: string; name: string }[]>([]);
  const { ref, inView } = useInView();

  useEffect(() => {
    fetchCouncils().then((data) => { if (data.length) setCouncils(data); });
    fetch("/api/committee")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data?.members?.length) setMembers(data.members);
      })
      .catch(() => {});
  }, []);

  const grouped = members.reduce(
    (acc, m) => {
      (acc[m.council] = acc[m.council] || []).push(m);
      return acc;
    },
    {} as Record<string, Member[]>,
  );

  if (!members.length) return null;

  return (
    <section id="leadership" className="scroll-mt-16 bg-nobuk-light px-4 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto mb-16 max-w-xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-light px-4 py-1.5 text-xs font-bold text-amber-dark uppercase tracking-widest">
            <Medal size={12} />
            Leadership
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-white md:text-4xl">
            Fellowship Members
          </h2>
          <p className="mt-3 text-white/70">
            Honour a committee member with your contribution to the Harambee
          </p>
        </div>

        <div ref={ref} className="space-y-12">
          {Object.entries(grouped).map(([council, councilMembers], gi) => {
            const label = getCouncilLabel(council, councils);
            const def = defaultCouncilLabels[council] || { label: council, icon: colorCycle[gi % colorCycle.length], color: "bg-amber text-nobuk" };
            const config = def;
            config.label = label;
            const Icon = config.icon;

            return (
              <div key={council}>
                <div className={`mb-5 flex items-center gap-3 ${inView ? "animate-slide-up" : "opacity-0"}`} style={{ animationDelay: `${gi * 0.1}s` }}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.color}`}>
                    <Icon size={14} />
                  </div>
                  <h3 className="text-lg font-bold text-white">{config.label}</h3>
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-white/50">{councilMembers.length} members</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {councilMembers.map((member, mi) => (
                    <div
                      key={member.id}
                      className={`card-hover group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${
                        inView ? "animate-slide-up" : "opacity-0"
                      }`}
                      style={{ animationDelay: `${gi * 0.1 + mi * 0.05}s` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-sm font-bold text-nobuk transition-all group-hover:scale-110 group-hover:bg-nobuk group-hover:text-white">
                          {initials(member.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-nobuk">{member.name}</p>
                          <p className="text-xs text-muted">{member.role}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-nobuk opacity-0 transition-opacity group-hover:opacity-100">
                        <Heart size={12} />
                        <span>Honour this member</span>
                      </div>

                      <a
                        href={`#give?member=${member.id}`}
                        className="absolute inset-0"
                        aria-label={`Give and honour ${member.name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className={`mt-12 text-center ${inView ? "animate-fade-in" : "opacity-0"}`} style={{ animationDelay: "0.5s" }}>
          <a
            href="#give"
            className="btn-lift inline-flex items-center gap-2 rounded-full bg-nobuk px-8 py-3.5 text-base font-bold text-white shadow-sm hover:bg-nobuk-light"
          >
            <Heart size={18} />
            Give & Honour
          </a>
        </div>
      </div>
    </section>
  );
}
