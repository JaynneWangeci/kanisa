import { useState, useEffect, useRef } from 'react';
import { Heart, Medal, Users, Church, ChevronDown, Check, Search, User } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import DonationModal from './DonationModal';

interface Member {
  id: string;
  name: string;
  council: string;
}

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
  const seedMembers: Member[] = [
    { id: '1', name: 'Dadson Mbogo', council: 'parish_board' },
    { id: '2', name: 'Jeremiah Kimani', council: 'parish_board' },
    { id: '3', name: 'Kariuki Nderitu', council: 'parish_board' },
    { id: '4', name: 'Joseph Kamande', council: 'parish_board' },
    { id: '5', name: 'Johnson Kamau', council: 'parish_board' },
    { id: '6', name: 'George Kibia', council: 'parish_board' },
    { id: '7', name: 'Magdalene Wageni', council: 'women_council' },
    { id: '8', name: 'Alice Kuhunya', council: 'women_council' },
    { id: '9', name: 'Tiffany Kimani', council: 'women_council' },
    { id: '10', name: 'Esther Mbugua', council: 'women_council' },
    { id: '11', name: 'Gilbert Wachira', council: 'men_council' },
    { id: '12', name: "Sam Ndiang'ui", council: 'development' },
    { id: '13', name: 'Wilson Thirikwa', council: 'development' },
    { id: '14', name: 'Maria Goretti Njenga', council: 'development' },
  ];

  const [members, setMembers] = useState<Member[]>(seedMembers);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [donorName, setDonorName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView();

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.ok && r.json())
      .then(data => { if (data?.members?.length) setMembers(data.members); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : members;

  const grouped = filtered.reduce((acc, m) => {
    (acc[m.council] = acc[m.council] || []).push(m);
    return acc;
  }, {} as Record<string, Member[]>);

  const councilOrder = ['parish_board', 'women_council', 'men_council', 'development'];

  function getSelectionTitle(): string {
    if (selectedMember) return `Honouring: ${selectedMember.name}`;
    if (donorName.trim()) return `Giving in my name: ${donorName.trim()}`;
    return 'Give to the Harambee';
  }

  function handleContribute() {
    if (selectedMember) {
      setShowModal(true);
    } else {
      setSelectedMember({ id: 'general', name: donorName.trim() || 'General Harambee Fund', council: '' });
      setShowModal(true);
    }
  }

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
              Give to the Harambee
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#4b5b47]">
              Give in your name or honour a church member with your contribution.
            </p>
          </div>

          <div ref={ref} className="mx-auto max-w-lg">
            {/* Your Name (free text) */}
            <div className="mb-4">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1f2a1d]">
                <User size={14} className="text-[#85AB8B]" /> Your name <span className="font-normal text-[#4b5b47]">(optional)</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#85AB8B]/60" />
                <input
                  type="text"
                  placeholder="e.g. Mary Wanjiku"
                  value={donorName}
                  onChange={e => { setDonorName(e.target.value); if (selectedMember) setSelectedMember(null); }}
                  className="w-full rounded-2xl border-2 border-[#336443]/20 bg-white py-4 pl-11 pr-4 text-base text-[#1f2a1d] outline-none transition placeholder:text-[#4b5b47]/40 focus:border-[#336443]"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-[#2d3a2a]/10" />
              <span className="text-xs font-medium text-[#4b5b47]">OR</span>
              <div className="h-px flex-1 bg-[#2d3a2a]/10" />
            </div>

            {/* Honour a Member Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-[#336443]/20 bg-white p-4 shadow-sm text-left transition-all hover:border-[#336443]/40"
              >
                {selectedMember ? (
                  <>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#85AB8B]/20 text-sm font-bold text-[#336443]">
                      {initials(selectedMember.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-[#1f2a1d]">{selectedMember.name}</p>
                      <p className="text-xs text-[#4b5b47]">
                        {councilMeta[selectedMember.council]?.label || selectedMember.council}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[#85AB8B]/40 bg-[#85AB8B]/10 text-[#336443]">
                      <Medal size={18} />
                    </div>
                    <span className="text-base font-medium text-[#4b5b47]">Honour a member (optional)</span>
                  </>
                )}
                <ChevronDown size={20} className={`ml-auto shrink-0 text-[#336443] transition ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[#2d3a2a]/10 bg-white shadow-xl animate-scale-in">
                  <div className="border-b border-[#2d3a2a]/10 bg-[#85AB8B]/5 p-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4b5b47]" />
                      <input
                        type="text"
                        placeholder="Search members..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-[#2d3a2a]/20 bg-white py-2.5 pl-9 pr-3 text-sm text-[#1f2a1d] placeholder-[#4b5b47]/50 outline-none focus:border-[#336443]"
                      />
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[#2d3a2a]/5">
                    {councilOrder.map(council => {
                      const councilMembers = grouped[council];
                      if (!councilMembers?.length) return null;
                      const meta = councilMeta[council] || { label: council, icon: Church, color: 'bg-[#2d3a2a] text-white' };
                      const Icon = meta.icon;

                      return (
                        <div key={council}>
                          <div className="sticky top-0 flex items-center gap-2 bg-[#85AB8B]/10 px-4 py-2">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.color} text-[10px]`}>
                              <Icon size={12} />
                            </div>
                            <span className="text-xs font-bold text-[#336443] uppercase tracking-wider">{meta.label}</span>
                            <span className="ml-auto text-[10px] text-[#4b5b47]">{councilMembers.length}</span>
                          </div>
                          {councilMembers.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => { setSelectedMember(m); setDropdownOpen(false); setSearch(''); setDonorName(''); }}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${
                                selectedMember?.id === m.id
                                  ? 'bg-[#85AB8B]/20 font-bold'
                                  : 'hover:bg-[#85AB8B]/10 hover:pl-5'
                              }`}
                            >
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                selectedMember?.id === m.id
                                  ? 'bg-[#336443] text-white'
                                  : 'bg-[#85AB8B]/20 text-[#336443]'
                              }`}>
                                {initials(m.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${selectedMember?.id === m.id ? 'text-[#1f2a1d] font-bold' : 'text-[#1f2a1d] font-medium'}`}>{m.name}</p>
                              </div>
                              {selectedMember?.id === m.id && (
                                <Check size={16} className="text-[#336443]" />
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {filtered.length === 0 && (
                      <div className="px-4 py-12 text-center">
                        <Search size={24} className="mx-auto mb-2 text-[#85AB8B]/30" />
                        <p className="text-sm font-medium text-[#4b5b47]">No members found</p>
                        <p className="text-xs text-[#4b5b47]/60">Try a different search term</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected member badge */}
            {selectedMember && (
              <div className={`mt-4 flex items-center gap-3 rounded-xl border border-[#336443]/20 bg-[#85AB8B]/10 px-4 py-3 ${inView ? 'animate-fade-in' : 'opacity-0'}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#336443]">
                  <Medal size={14} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1f2a1d]">Honouring: {selectedMember.name}</p>
                  <p className="text-xs text-[#4b5b47]">{councilMeta[selectedMember.council]?.label || selectedMember.council}</p>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-[#4b5b47] underline hover:text-[#1f2a1d]"
                >
                  Change
                </button>
              </div>
            )}

            {(donorName.trim() || selectedMember) && (
              <div className={`mt-4 flex items-center gap-3 rounded-xl border border-[#336443]/20 bg-[#85AB8B]/5 px-4 py-3 ${inView ? 'animate-fade-in' : 'opacity-0'}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#336443]">
                  <Heart size={14} className="text-white" />
                </div>
                <p className="text-sm font-bold text-[#1f2a1d]">{getSelectionTitle()}</p>
              </div>
            )}

            {/* Contribute button */}
            <div className={`mt-8 text-center ${inView ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
              <button
                onClick={handleContribute}
                disabled={!donorName.trim() && !selectedMember}
                className="btn-lift w-full rounded-full bg-[#1f2a1d] px-8 py-4 text-base font-bold text-white shadow-sm hover:bg-[#2a3827] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Give
              </button>
            </div>
          </div>

          {/* General fund CTA */}
          <div className={`mt-16 text-center ${inView ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>
            <div className="mx-auto max-w-lg rounded-2xl border border-white/20 bg-white/70 backdrop-blur-md p-8 shadow-sm">
              <Heart size={24} className="mx-auto mb-3 text-[#336443]" />
              <h3 className="text-xl font-bold text-[#1f2a1d]">Or give directly via M-Pesa</h3>
              <p className="mt-1 text-lg font-bold text-[#336443]">Paybill: 835 872</p>
            </div>
          </div>
        </div>
      </section>

      {showModal && selectedMember && (
        <DonationModal
          member={selectedMember}
          donorName={donorName}
          onClose={() => { setShowModal(false); setSelectedMember(null); setDonorName(''); }}
        />
      )}
    </>
  );
}