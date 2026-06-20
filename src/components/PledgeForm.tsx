import { useState, useEffect, useRef } from 'react';
import { Heart, Phone, ChevronDown, Check, Loader2, Search, Church, Users, Medal } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  donorName?: string;
}

interface Member {
  id: string;
  name: string;
  council: string;
}

const freqOptions = [
  { value: 'daily', en: 'Daily', sw: 'Kila siku' },
  { value: 'weekly', en: 'Weekly', sw: 'Kila wiki' },
  { value: 'monthly', en: 'Monthly', sw: 'Kila mwezi' },
];

const councilMeta: Record<string, { label: string; icon: typeof Church }> = {
  parish_board: { label: 'Parish Board', icon: Church },
  women_council: { label: "Women's Council", icon: Users },
  men_council: { label: "Men's Council", icon: Users },
  development: { label: 'Development Committee', icon: Medal },
};

const councilOrder = ['parish_board', 'women_council', 'men_council', 'development'];

export default function PledgeForm({ onClose, onCreated, donorName: initialName }: Props) {
  const { t } = useLang();
  const [name, setName] = useState(initialName || '');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [autoAdding, setAutoAdding] = useState(false);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [reminderFreq, setReminderFreq] = useState('weekly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.ok && r.json())
      .then(d => { if (d?.members?.length) setMembers(d.members); })
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

  const filtered = name
    ? members.filter(m => m.name.toLowerCase().includes(name.toLowerCase()))
    : members;

  const grouped = filtered.reduce((acc, m) => {
    (acc[m.council] = acc[m.council] || []).push(m);
    return acc;
  }, {} as Record<string, Member[]>);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError(t('Kindly enter your name', 'Tafadhali ingiza jina lako')); return; }
    const amt = Number(amount);
    if (!amt || amt < 10) { setError(t('Please enter an amount of KES 10 or more', 'Kiasi lazma kiwe angalau KES 10')); return; }

    // Auto-save typed name if not in DB
    const exists = members.some(m => m.name.toLowerCase() === name.trim().toLowerCase());
    if (!exists && name.trim().length >= 2) {
      setAutoAdding(true);
      try {
        await fetch('/api/members/auto-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), council: 'development' }),
        });
      } catch {}
      setAutoAdding(false);
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor_name: name.trim(), amount: amt, whatsapp_number: phone || null, reminder_freq: reminderFreq }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || t('Something went wrong. Please try again.', 'Kuna tatizo. Tafadhali jaribu tena.')); return; }
      onCreated();
      onClose();
    } catch { setError(t('A connection issue occurred. Kindly try again.', 'Hitilafu ya mtandao. Tafadhali jaribu tena.')); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Heart size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t('Make a Pledge', 'Weka Ahadi')}</h2>
            <p className="text-xs text-gray-500">{t('Commit to give and track your progress', 'Jitolee kutoa na fuatilia maendeleo yako')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div ref={dropdownRef} className="relative">
            <label className="mb-1 block text-xs font-bold text-gray-700">{t('Your Name', 'Jina Lako')}</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={name} onChange={e => { setName(e.target.value); setSelectedMember(null); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder={t('Type your name or select from list...', 'Andika jina lako au chagua kutoka orodha...')}
                className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-sm text-gray-900 outline-none focus:border-blue-500" />
            </div>

            {showSuggestions && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg animate-scale-in">
                <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                  {councilOrder.map(council => {
                    const councilMembers = grouped[council];
                    if (!councilMembers?.length) return null;
                    const meta = councilMeta[council] || { label: council, icon: Medal };
                    const Icon = meta.icon;
                    return (
                      <div key={council}>
                        <div className="sticky top-0 flex items-center gap-2 bg-gray-50 px-4 py-1.5">
                          <Icon size={12} className="text-gray-500" />
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{meta.label}</span>
                        </div>
                        {councilMembers.map(m => (
                          <button key={m.id} type="button" onClick={() => { setName(m.name); setSelectedMember(m); setShowSuggestions(false); }}
                            className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-blue-50 ${
                              name === m.name ? 'bg-blue-50 font-bold' : ''
                            }`}>
                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                              name === m.name ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <p className="text-sm text-gray-900">{m.name}</p>
                            {name === m.name && <Check size={14} className="ml-auto text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">{t('Pledge Amount (KES)', 'Kiasi cha Ahadi (KES)')}</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 10000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <Phone size={12} /> {t('WhatsApp Number (for reminders)', 'Nambari ya WhatsApp (kwa vikumbusho)')}
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXX"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">
              {t('Reminder Frequency', 'Mara kwa mara ya vikumbusho')}
            </label>
            <div className="flex gap-2">
              {freqOptions.map(f => (
                <button key={f.value} type="button" onClick={() => setReminderFreq(f.value)}
                  className={`flex-1 rounded-lg py-2.5 text-xs font-bold transition ${
                    reminderFreq === f.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-200 text-gray-600 hover:border-blue-500'
                  }`}>
                  {t(f.en, f.sw)}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-500">{error}</p>}

          <button type="submit" disabled={submitting || autoAdding}
            className="btn-lift w-full rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40">
            {submitting || autoAdding
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {autoAdding ? t('Saving name...', 'Inahifadhi jina...') : t('Submitting...', 'Inatuma...')}</span>
              : t('Submit Pledge', 'Wasilisha Ahadi')}
          </button>
        </form>
      </div>
    </div>
  );
}
