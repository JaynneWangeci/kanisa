"use client";

import { useEffect, useState } from "react";
import { Users, Medal, Shield } from "lucide-react";

interface Member {
  id: string;
  name: string;
  role: string;
  council: string;
}

const councils = [
  { key: "parish_board", label: "Parish Board", icon: Shield },
  { key: "women_council", label: "Women's Council", icon: Medal },
  { key: "men_council", label: "Men's Council", icon: Medal },
  { key: "development", label: "Development Committee", icon: Users },
];

const fallback: Member[] = [
  { id: "1", name: "Dadson Mbogo", role: "Parish board chairman", council: "parish_board" },
  { id: "2", name: "Jeremiah Kimani", role: "V Chairman", council: "parish_board" },
  { id: "3", name: "Kariuki Nderitu", role: "General Secretary", council: "parish_board" },
  { id: "4", name: "Joseph Kamande", role: "Vice General Secretary", council: "parish_board" },
  { id: "5", name: "Johnson Kamau", role: "Treasurer", council: "parish_board" },
  { id: "6", name: "George Kibia", role: "Vice Treasurer", council: "parish_board" },
  { id: "7", name: "Magdalene Wageni", role: "Chairlady", council: "women_council" },
  { id: "8", name: "Alice Kuhunya", role: "V Chairlady", council: "women_council" },
  { id: "9", name: "Tiffany Kimani", role: "Women council Secretary", council: "women_council" },
  { id: "10", name: "Esther Mbugua", role: "Women council Treasurer", council: "women_council" },
  { id: "11", name: "Gilbert Wachira", role: "Men council chairman", council: "men_council" },
  { id: "12", name: "Sam Ndiang'ui", role: "Development chairman", council: "development" },
  { id: "13", name: "Wilson Thirikwa", role: "Development Secretary", council: "development" },
  { id: "14", name: "Maria goretti Njenga", role: "Development Treasurer", council: "development" },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function LeadershipSection() {
  const [members, setMembers] = useState<Member[]>(fallback);

  useEffect(() => {
    fetch("/api/committee")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setMembers(data);
      })
      .catch(() => {});
  }, []);

  return (
    <section id="committee" className="scroll-mt-16 bg-slate px-4 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <div className="animate-slide-up text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-nobuk-muted px-4 py-1.5 text-xs font-medium text-nobuk uppercase tracking-wider">
            <Users size={12} />
            Committee
          </span>
          <h2 className="mt-4 text-3xl font-bold text-nobuk md:text-4xl">
            Honor a Committee Member
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            When giving, you can choose to honour one of our dedicated committee
            members leading this harambee
          </p>
        </div>

        {councils.map((council) => {
          const group = members.filter((m) => m.council === council.key);
          if (group.length === 0) return null;

          const Icon = council.icon;

          return (
            <div key={council.key} className="mt-10 first:mt-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-nobuk-muted">
                  <Icon size={13} className="text-nobuk" />
                </div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {council.label}
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((member, i) => (
                  <div
                    key={member.id}
                    className="animate-slide-up group flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md hover:border-nobuk/20"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nobuk-muted text-sm font-bold text-nobuk transition group-hover:bg-nobuk group-hover:text-white">
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink truncate">
                        {member.name}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-8 animate-fade-in text-center">
          <a
            href="#give"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("give")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 rounded-full bg-nobuk px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-nobuk-light"
          >
            Give &amp; Honour a Member
          </a>
        </div>
      </div>
    </section>
  );
}
