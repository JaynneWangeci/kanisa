import { useState, useEffect, useRef } from 'react';
import { Heart, Medal, Users, Church, ChevronDown, Check, Search, User, HandHeart } from 'lucide-react';
import { useInView } from '../hooks/useInView';
import { useLang } from '../context/LanguageContext';
import DonationModal from './DonationModal';
import PledgeForm from './PledgeForm';

interface Member {
  id: string;
  name: string;
  council: string;
}

const councilMeta: Record<string, { label: string; icon: typeof Church; color: string }> = {
  parish_board: { label: 'Parish Board', icon: Church, color: 'bg-[#1E6F9F] text-white' },
  women_council: { label: "Women's Council", icon: Users, color: 'bg-[#5B9BD5] text-white' },
  men_council: { label: "Men's Council", icon: Users, color: 'bg-[#3A5A7A] text-white' },
  development: { label: 'Development Committee', icon: Medal, color: 'bg-[#2C4056] text-white' },
};

function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ContributeSection() {
  const { t } = useLang();
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
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
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
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = inputValue
    ? members.filter(m => m.name.toLowerCase().includes(inputValue.toLowerCase()))
    : members;

  const grouped = filtered.reduce((acc, m) => {
    (acc[m.council] = acc[m.council] || []).push(m);
    return acc;
  }, {} as Record<string, Member[]>);

  const councilOrder = ['parish_board', 'women_council', 'men_council', 'development'];

  function getSelectionTitle(): string {
    if (selectedMember) return `${t('Honouring', 'Kumheshimu')}: ${selectedMember.name}`;
    if (inputValue.trim()) return `${t('Giving in my name', 'Natoa kwa jina langu')}: ${inputValue.trim()}`;
    return t('Give to the Harambee', 'Toa kwa Harambee');
  }

  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [autoAdding, setAutoAdding] = useState(false);

  async function handleContribute() {
    if (selectedMember) {
      setShowModal(true);
    } else if (inputValue.trim()) {
      // Auto-save typed names not in DB
      const exists = members.some(m => m.name.toLowerCase() === inputValue.trim().toLowerCase());
      if (!exists && inputValue.trim().length >= 2) {
        setAutoAdding(true);
        try {
          await fetch('/api/members/auto-add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: inputValue.trim(), council: 'development' }),
          });
          fetch('/api/members')
            .then(r => r.ok && r.json())
            .then(d => { if (d?.members?.length) setMembers(d.members); })
            .catch(() => {});
        } catch {}
        setAutoAdding(false);
      }
      setSelectedMember({ id: 'general', name: 'General Harambee Fund', council: '' });
      setShowModal(true);
    }
  }

  return (
    <>
      <section id="contribute" className="scroll-mt-16 bg-white/10 backdrop-blur-sm px-4 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5B9BD5]/10 px-4 py-1.5 text-xs font-bold text-[#1E6F9F] uppercase tracking-widest">
              <Medal size={12} />
              {t('Contribute', 'Changia')}
            </span>
            <h2 className="mt-4 text-3xl font-bold text-[#1B2838] md:text-4xl" style={{ fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif', letterSpacing: '-0.02em' }}>
              {t('Give to the Harambee', 'Toa kwa Harambee')}
            </h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#5B6F88]">
              {t('Give in your name or honour a church member with your contribution.', 'Toa kwa jina lako au mheshimu mwanajumuiya kwa mchango wako.')}
            </p>
          </div>

          <div ref={ref} className="mx-auto max-w-lg">
            {/* Your name - type or select from dropdown */}
            <div ref={dropdownRef} className="relative">
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1B2838]">
                <User size={14} className="text-[#5B9BD5]" /> {t('Your name', 'Jina lako')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5B6F88]" />
                <input
                  type="text"
                  placeholder={t('Type your name or select from the list...', 'Andika jina lako au chagua kutoka kwenye orodha...')}
                  value={inputValue}
                  onChange={e => {
                    setInputValue(e.target.value);
                    if (selectedMember) setSelectedMember(null);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full rounded-2xl border-2 border-[#1E6F9F]/20 bg-white py-4 pl-10 pr-4 text-base font-medium text-[#1B2838] outline-none transition-all focus:border-[#1E6F9F] placeholder:text-[#5B6F88]/60"
                />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[#2C4056]/10 bg-white shadow-xl animate-scale-in">
                  <div className="max-h-64 overflow-y-auto divide-y divide-[#2C4056]/5">
                    {councilOrder.map(council => {
                      const councilMembers = grouped[council];
                      if (!councilMembers?.length) return null;
                      const meta = councilMeta[council] || { label: council, icon: Church, color: 'bg-[#2C4056] text-white' };
                      const Icon = meta.icon;

                      return (
                        <div key={council}>
                          <div className="sticky top-0 flex items-center gap-2 bg-[#5B9BD5]/10 px-4 py-2">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full ${meta.color} text-[10px]`}>
                              <Icon size={12} />
                            </div>
                            <span className="text-xs font-bold text-[#1E6F9F] uppercase tracking-wider">{meta.label}</span>
                            <span className="ml-auto text-[10px] text-[#5B6F88]">{councilMembers.length}</span>
                          </div>
                          {councilMembers.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedMember(m);
                                setInputValue(m.name);
                                setShowSuggestions(false);
                              }}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-all ${
                                selectedMember?.id === m.id
                                  ? 'bg-[#5B9BD5]/20 font-bold'
                                  : 'hover:bg-[#5B9BD5]/10 hover:pl-5'
                              }`}
                            >
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                selectedMember?.id === m.id
                                  ? 'bg-[#1E6F9F] text-white'
                                  : 'bg-[#5B9BD5]/20 text-[#1E6F9F]'
                              }`}>
                                {initials(m.name)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm ${selectedMember?.id === m.id ? 'text-[#1B2838] font-bold' : 'text-[#1B2838] font-medium'}`}>{m.name}</p>
                              </div>
                              {selectedMember?.id === m.id && (
                                <Check size={16} className="text-[#1E6F9F]" />
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                    {filtered.length === 0 && inputValue.trim() && (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm font-medium text-[#5B6F88]">Using "<span className="font-bold text-[#1B2838]">{inputValue}</span>" as your name</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected member badge */}
            {selectedMember && (
              <div className={`mt-4 flex items-center gap-3 rounded-xl border border-[#1E6F9F]/20 bg-[#5B9BD5]/10 px-4 py-3 ${inView ? 'animate-fade-in' : 'opacity-0'}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E6F9F]">
                  <Medal size={14} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#1B2838]">{t('Honouring', 'Kumheshimu')}: {selectedMember.name}</p>
                  <p className="text-xs text-[#5B6F88]">{councilMeta[selectedMember.council]?.label || selectedMember.council}</p>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="text-xs text-[#5B6F88] underline hover:text-[#1B2838]"
                >
                  Change
                </button>
              </div>
            )}

            {(inputValue.trim() || selectedMember) && (
              <div className={`mt-4 flex items-center gap-3 rounded-xl border border-[#1E6F9F]/20 bg-[#5B9BD5]/5 px-4 py-3 ${inView ? 'animate-fade-in' : 'opacity-0'}`}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E6F9F]">
                  <Heart size={14} className="text-white" />
                </div>
                <p className="text-sm font-bold text-[#1B2838]">{getSelectionTitle()}</p>
              </div>
            )}

            {/* Contribute button */}
            <div className={`mt-8 text-center ${inView ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.2s' }}>
              <button
                onClick={handleContribute}
                disabled={autoAdding || !inputValue.trim()}
                className="btn-lift w-full rounded-full bg-[#1B2838] px-8 py-4 text-base font-bold text-white shadow-sm hover:bg-[#3B5A7A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {autoAdding ? t('Saving name...', 'Inahifadhi jina...') : t('Continue to Give', 'Endelea Kutoa')}
              </button>
            </div>
          </div>

          {/* General fund CTA */}
          <div className={`mt-10 text-center ${inView ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.5s' }}>
            <div className="mx-auto max-w-lg rounded-2xl border border-white/20 bg-white/70 backdrop-blur-md p-8 shadow-sm">
              <Heart size={24} className="mx-auto mb-3 text-[#1E6F9F]" />
              <h3 className="text-xl font-bold text-[#1B2838]">{t('Or give directly via M-Pesa', 'Au toa moja kwa moja kupitia M-Pesa')}</h3>
              <p className="mt-1 text-lg font-bold text-[#1E6F9F]">Paybill: 835 872</p>
            </div>
          </div>

          {/* Pledge CTA */}
          <div className={`mt-8 text-center ${inView ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.6s' }}>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
              <div className="relative flex justify-center"><span className="bg-[#f5f7f4] px-3 text-xs text-[#5B6F88]">{t('or', 'au')}</span></div>
            </div>
            <button type="button" onClick={() => setShowPledgeForm(true)}
              className="btn-lift inline-flex items-center gap-2 rounded-full border-2 border-[#5B9BD5]/30 bg-white px-8 py-4 text-base font-bold text-[#1E6F9F] shadow-sm hover:border-[#5B9BD5] hover:bg-blue-50 transition-all">
              <HandHeart size={20} />
              {t('Make a Pledge — Commit & Track Your Giving', 'Weka Ahadi — Jitolee na Fuatilia Mchango Wako')}
            </button>
          </div>
        </div>
      </section>

      {showModal && selectedMember && (
        <DonationModal
          member={selectedMember}
          donorName={inputValue}
          onClose={() => { setShowModal(false); setSelectedMember(null); setInputValue(''); }}
        />
      )}

      {showPledgeForm && (
        <PledgeForm
          donorName={inputValue}
          onClose={() => setShowPledgeForm(false)}
          onCreated={() => {}}
        />
      )}
    </>
  );
}