import { useState, useEffect } from 'react';
import { Heart, Medal, Users, Church, Search } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import DonationModal from './DonationModal';

interface Member {
  id: string;
  name: string;
  role: string;
  council: string;
  photo_url: string | null;
}

const seedMembers: Member[] = [
  { id: '1', name: 'Dadson Mbogo', role: 'Parish board chairman', council: 'parish_board', photo_url: null },
  { id: '2', name: 'Jeremiah Kimani', role: 'V Chairman', council: 'parish_board', photo_url: null },
  { id: '3', name: 'Kariuki Nderitu', role: 'General Secretary', council: 'parish_board', photo_url: null },
  { id: '4', name: 'Joseph Kamande', role: 'Vice General Secretary', council: 'parish_board', photo_url: null },
  { id: '5', name: 'Johnson Kamau', role: 'Treasurer', council: 'parish_board', photo_url: null },
  { id: '6', name: 'George Kibia', role: 'Vice Treasurer', council: 'parish_board', photo_url: null },
  { id: '7', name: 'Magdalene Wageni', role: 'Chairlady', council: 'women_council', photo_url: null },
  { id: '8', name: 'Alice Kuhunya', role: 'V Chairlady', council: 'women_council', photo_url: null },
  { id: '9', name: 'Tiffany Kimani', role: 'Women council Secretary', council: 'women_council', photo_url: null },
  { id: '10', name: 'Esther Mbugua', role: 'Women council Treasurer', council: 'women_council', photo_url: null },
  { id: '11', name: 'Gilbert Wachira', role: 'Men council chairman', council: 'men_council', photo_url: null },
  { id: '12', name: 'Sam Ndiang\'ui', role: 'Development chairman', council: 'development', photo_url: null },
  { id: '13', name: 'Wilson Thirikwa', role: 'Development Secretary', council: 'development', photo_url: null },
  { id: '14', name: 'Maria goretti Njenga', role: 'Development Treasurer', council: 'development', photo_url: null },
];

const councilMeta: Record<string, { label: string; icon: typeof Church; color: string }> = {
  parish_board: { label: 'Parish Board', icon: Church, color: 'bg-[#336443] text-white' },
  women_council: { label: "Women's Council", icon: Users, color: 'bg-[#85AB8B] text-white' },
  men_council: { label: "Men's Council", icon: Users, color: 'bg-[#3d5638] text-white' },
  development: { label: 'Development Committee', icon: Medal, color: 'bg-[#2d3a2a] text-white' },
};

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ContributeSection() {
  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [search, setSearch] = useState('');
  const { ref, inView } = useInView();

  useEffect(() => {
    fetch('/api/committee')
      .then(r => r.ok && r.json())
      .then(data => { if (data?.members?.length) setMembers(data.members); })
      .catch(() => {});
  }, []);

  const filtered = search
    ? members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.role.toLowerCase().includes(search.toLowerCase()))
    : members;

  const grouped = filtered.reduce((acc, m) => {
    (acc[m.council] = acc[m.council] || []).push(m);
    return acc;
  }, {} as Record<string, Member[]>);

  return (
    <>
      <section id="contribute" className="scroll-mt-16 bg-white/10 backdrop-blur-sm px-4 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#85AB8B]/10 px-4 py-1.5 text-xs font-bold text-[#336443] uppercase tracking-widest">
              <Medal size={12} />
              Contribute
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1f2a1d] md:text-4xl" style={{ fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif', letterSpacing: '-0.02em' }}>
              Honour a Leader
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#4b5b47]">
              Select a committee member to honour with your contribution to the Harambee.
            </p>
          </div>

          {/* Search */}
          <div className="mx-auto mb-10 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4b5b47]" />
              <input
                type="text"
                placeholder="Search members..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-full border border-[#2d3a2a]/20 bg-white py-3 pl-10 pr-4 text-sm text-[#1f2a1d] placeholder-[#4b5b47]/50 outline-none transition focus:border-[#336443] focus:ring-2 focus:ring-[#336443]/20"
              />
            </div>
          </div>

          <div ref={ref} className="space-y-12">
            {Object.entries(grouped).map(([council, councilMembers], gi) => {
              const meta = councilMeta[council] || { label: council, icon: Church, color: 'bg-[#2d3a2a] text-white' };
              const Icon = meta.icon;

              return (
                <div key={council}>
                  <div className={`mb-5 flex items-center gap-3 ${inView ? 'animate-slide-up' : 'opacity-0'}`} style={{ animationDelay: `${gi * 0.1}s` }}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${meta.color}`}>
                      <Icon size={14} />
                    </div>
                    <h3 className="text-lg font-bold text-[#1f2a1d]">{meta.label}</h3>
                    <div className="h-px flex-1 bg-[#2d3a2a]/10" />
                    <span className="text-xs text-[#4b5b47]">{councilMembers.length} members</span>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {councilMembers.map((member, mi) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedMember(member)}
                        className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 backdrop-blur-md p-5 shadow-sm text-left transition-all duration-300 hover:border-[#336443]/30 hover:shadow-lg hover:-translate-y-1 ${
                          inView ? 'animate-slide-up' : 'opacity-0'
                        }`}
                        style={{ animationDelay: `${gi * 0.1 + mi * 0.05}s` }}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#85AB8B]/20 text-sm font-bold text-[#336443] transition-all group-hover:scale-110 group-hover:bg-[#336443] group-hover:text-white">
                            {initials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#1f2a1d]">{member.name}</p>
                            <p className="text-xs text-[#4b5b47]">{member.role}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#336443] opacity-0 transition-all group-hover:opacity-100">
                          <Heart size={12} />
                          <span>Honour this member</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <Search size={32} className="mx-auto mb-3 text-[#85AB8B]/30" />
                <p className="text-sm font-medium text-[#4b5b47]">No members found</p>
                <p className="text-xs text-[#4b5b47]/60">Try a different search term</p>
              </div>
            )}
          </div>

          {/* General fund CTA */}
          <div className={`mt-16 text-center ${inView ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>
            <div className="mx-auto max-w-lg rounded-2xl border border-white/20 bg-white/70 backdrop-blur-md p-8 shadow-sm">
              <Heart size={24} className="mx-auto mb-3 text-[#336443]" />
              <h3 className="text-xl font-bold text-[#1f2a1d]">Give to the General Fund</h3>
              <p className="mt-1 text-sm text-[#4b5b47]">Support the Harambee without naming a specific member.</p>
              <button
                onClick={() => setSelectedMember({ id: 'general', name: '', role: '', council: '', photo_url: null })}
                className="btn-lift mt-4 inline-flex items-center gap-2 rounded-full bg-[#1f2a1d] px-6 py-3 text-sm font-semibold text-white hover:bg-[#2a3827]"
              >
                <Heart size={14} />
                Give to Harambee
              </button>
            </div>
          </div>
        </div>
      </section>

      {selectedMember && (
        <DonationModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </>
  );
}
