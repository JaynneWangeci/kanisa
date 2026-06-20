import { useState } from 'react';
import { Heart, Phone, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  donorName?: string;
}

const freqOptions = [
  { value: 'daily', en: 'Daily', sw: 'Kila siku' },
  { value: 'weekly', en: 'Weekly', sw: 'Kila wiki' },
  { value: 'monthly', en: 'Monthly', sw: 'Kila mwezi' },
];

export default function PledgeForm({ onClose, onCreated, donorName: initialName }: Props) {
  const { t } = useLang();
  const [name, setName] = useState(initialName || '');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [reminderFreq, setReminderFreq] = useState('weekly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError(t('Please enter your name', 'Tafadhali ingiza jina lako')); return; }
    const amt = Number(amount);
    if (!amt || amt < 10) { setError(t('Amount must be at least KES 10', 'Kiasi lazma kiwe angalau KES 10')); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donor_name: name.trim(), amount: amt, whatsapp_number: phone || null, reminder_freq: reminderFreq }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return; }
      onCreated();
      onClose();
    } catch { setError(t('Network error', 'Hitilafu ya mtandao')); }
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
          <div>
            <label className="mb-1 block text-xs font-bold text-gray-700">{t('Your Name', 'Jina Lako')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500" />
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

          <button type="submit" disabled={submitting}
            className="btn-lift w-full rounded-full bg-blue-600 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40">
            {submitting
              ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {t('Submitting...', 'Inatuma...')}</span>
              : t('Submit Pledge', 'Wasilisha Ahadi')}
          </button>
        </form>
      </div>
    </div>
  );
}
