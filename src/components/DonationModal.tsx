import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Heart, User, Phone, MessageSquare, Check, Loader2, ChevronDown, Search, Church, Users, Medal } from 'lucide-react';

type Step = 'form' | 'processing' | 'success';

const presets = [500, 1000, 2500, 5000, 10000];

interface Member {
  id: string;
  name: string;
  council?: string;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

const councilMeta: Record<string, { label: string; icon: typeof Church }> = {
  parish_board: { label: 'Parish Board', icon: Church },
  women_council: { label: "Women's Fellowship", icon: Users },
  men_council: { label: "Men's Fellowship", icon: Users },
  development: { label: 'Development Committee', icon: Medal },
};

interface Props {
  member: Member;
  donorName?: string;
  onClose: () => void;
}

export default function DonationModal({ member, onClose, donorName: initialDonorName }: Props) {
  const isGeneral = member.id === 'general';
  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState<number | 'custom' | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [name, setName] = useState(initialDonorName || '');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [finalAmount, setFinalAmount] = useState(0);
  const [finalDonorName, setFinalDonorName] = useState('');

  const [memberList, setMemberList] = useState<Member[]>([]);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [nameSearch, setNameSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/members')
      .then(r => r.ok && r.json())
      .then(data => { if (data?.members?.length) setMemberList(data.members); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const nameFiltered = nameSearch
    ? memberList
        .map(m => ({
          ...m,
          _score: m.name.toLowerCase() === nameSearch.toLowerCase() ? 3
            : m.name.toLowerCase().startsWith(nameSearch.toLowerCase()) ? 2
            : m.name.toLowerCase().includes(nameSearch.toLowerCase()) ? 1 : 0,
        }))
        .filter(m => m._score > 0)
        .sort((a, b) => b._score - a._score || a.name.localeCompare(b.name))
    : memberList;

  const grouped = nameFiltered.reduce((acc: Record<string, Member[]>, m) => {
    const key = m.council || 'other';
    (acc[key] = acc[key] || []).push(m);
    return acc;
  }, {});
  const councilOrder = Object.keys(councilMeta).filter(c => grouped[c]?.length);
  const extraCouncils = Object.keys(grouped).filter(c => !councilMeta[c]);
  const allCouncils = [...councilOrder, ...extraCouncils];

  function initials(n: string): string {
    return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
  }

  async function autoSaveName(n: string) {
    const exists = memberList.some(m => m.name.toLowerCase() === n.toLowerCase().trim());
    if (!exists && n.trim().length >= 2) {
      try {
        await fetch('/api/members/auto-add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: n.trim(), council: 'development' }),
        });
        fetch('/api/members')
          .then(r => r.ok && r.json())
          .then(d => { if (d?.members?.length) setMemberList(d.members); })
          .catch(() => {});
      } catch {}
    }
  }

  const pollStatus = useCallback((checkoutId: string) => {
    let attempts = 0;
    const maxAttempts = 100;
    const poll = async () => {
      try {
        const res = await fetch(`/api/mpesa/status/${checkoutId}`);
        const data = await res.json();
        if (String(data.ResultCode) === '0' || data.status === 'completed') {
          setReceiptNumber(data.receipt_number || `TXN-${Date.now()}`);
          setStep('success');
          return;
        }
        if (data.ResultCode !== undefined && String(data.ResultCode) !== '0' && data.status !== 'pending') {
          setError('The transaction didn\'t complete. You can try again or use M-Pesa Paybill 835872 directly.');
          setStep('form');
          return;
        }
      } catch {}
      attempts++;
      if (attempts < maxAttempts) {
        const delay = Math.min(1000 * Math.pow(1.05, attempts), 3000);
        setTimeout(poll, delay);
      } else {
        setError('M-Pesa is taking longer than usual. Your donation may still process — check your M-Pesa messages and refresh.');
        setStep('form');
      }
    };
    poll();
  }, []);

  async function processDonation() {
    setError('');
    if (!name.trim()) { setError('Kindly select your name'); return; }
    const amt = amount === 'custom' ? Number(customAmount) || 0 : amount || 0;
    if (amt < 10) { setError('Please enter an amount of KES 10 or more'); return; }
    const cleanPhone = phone.replace(/\s/g, '');
    if (!cleanPhone || cleanPhone.length < 10) { setError('Kindly provide the M-Pesa phone number you registered with'); return; }

    setStep('processing');
    setFinalAmount(amt);
    setFinalDonorName(name);

    await autoSaveName(name);

    try {
      const campRes = await fetch('/api/campaigns/development-fund');
      if (!campRes.ok) {
        const errData = await campRes.json().catch(() => ({}));
        setError(errData?.error || "We're having trouble connecting. Kindly try again.");
        setStep('form'); return;
      }
      const campData = await campRes.json();
      if (!campData?.id) { setError("We're setting up the campaign. Please try again shortly."); setStep('form'); return; }

      const donRes = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campData.id,
          donor_name: name || null,
          amount: amt,
          phone: cleanPhone,
          message: message || null,
          honored_member_id: null,
          church_member_id: isGeneral ? null : member.id,
        }),
      });
      const donData = await donRes.json();
      if (!donRes.ok || !donData.donation?.id) {
        setError(donData?.error || "Something went wrong. Please try again.");
        setStep('form'); return;
      }

      const mpesaRes = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          amount: amt,
          donation_id: donData.donation.id,
          account_reference: name || 'Harambee',
          transaction_desc: isGeneral ? 'General Donation' : `Honour: ${member.name}`,
        }),
      });
      const mpesaData = await mpesaRes.json().catch(() => ({}));
      if (!mpesaRes.ok || !mpesaData.CheckoutRequestID) {
        setError(mpesaData?.errorMessage || mpesaData?.error || 'The M-Pesa request didn\'t go through. Please try again or use Paybill 835872 directly.');
        setStep('form'); return;
      }

      pollStatus(mpesaData.CheckoutRequestID);
    } catch (err: any) {
      setError(err?.message || 'Network error. Please try again.');
      setStep('form');
    }
  }

  function reset() {
    setStep('form');
    setAmount(null); setCustomAmount(''); setPhone(''); setMessage('');
    setError(''); setReceiptNumber('');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#1B2838]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#2C4056]/10 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#5B9BD5]/20 text-sm font-bold text-[#1E6F9F]">
              {isGeneral ? <Heart size={16} /> : member.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-bold text-[#1B2838]">{isGeneral ? 'General Harambee Fund' : member.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#2C4056]/10 transition-colors">
            <X size={16} className="text-[#5B6F88]" />
          </button>
        </div>

        <div className="p-6">
          {step === 'form' && (
            <div className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-bold text-[#1B2838]">Amount (KES)</label>
                <div className="grid grid-cols-5 gap-2">
                  {presets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setAmount(p as any); setCustomAmount(''); }}
                      className={`rounded-lg py-2.5 text-sm font-bold transition ${
                        amount === p ? 'bg-[#1B2838] text-white shadow-sm' : 'border border-[#2C4056]/20 text-[#5B6F88] hover:border-[#1E6F9F] hover:text-[#1E6F9F]'
                      }`}
                    >
                      {p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  placeholder="Custom amount"
                  value={customAmount}
                  onChange={e => { setCustomAmount(e.target.value); if (e.target.value) setAmount('custom'); }}
                  className="mt-2 w-full rounded-xl border border-[#2C4056]/20 bg-white px-4 py-3 text-sm text-[#1B2838] outline-none transition focus:border-[#1E6F9F] placeholder:text-[#5B6F88]/40"
                />
              </div>

              <div ref={dropdownRef} className="relative">
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1B2838]">
                  <User size={14} className="text-[#5B9BD5]" /> Your name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6F88]" />
                  <input type="text" value={name} onChange={e => { setName(e.target.value); setNameSearch(e.target.value); setShowNameDropdown(true); }}
                    onFocus={() => setShowNameDropdown(true)}
                    placeholder="Type your name or select from list..."
                    className="w-full rounded-xl border border-[#2C4056]/20 bg-white py-3 pl-9 pr-3 text-sm text-[#1B2838] outline-none transition focus:border-[#1E6F9F] placeholder:text-[#5B6F88]/40" />
                </div>

                {showNameDropdown && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 overflow-hidden rounded-xl border border-[#2C4056]/10 bg-white shadow-lg">
                    <div className="max-h-48 overflow-y-auto divide-y divide-[#2C4056]/5">
                      {allCouncils.length > 0 ? allCouncils.map(council => {
                        const councilMembers = grouped[council];
                        if (!councilMembers?.length) return null;
                        const meta = councilMeta[council] || { label: council.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: Church };
                        const Icon = meta.icon;
                        return (
                          <div key={council}>
                            <div className="sticky top-0 flex items-center gap-2 bg-[#5B9BD5]/10 px-4 py-1.5">
                              <Icon size={12} className="text-[#1E6F9F]" />
                              <span className="text-xs font-bold text-[#1E6F9F] uppercase tracking-wider">{meta.label}</span>
                            </div>
                            {councilMembers.map(m => (
                              <button key={m.id} type="button"
                                onClick={() => { setName(m.name); setShowNameDropdown(false); }}
                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all hover:bg-[#5B9BD5]/5 ${
                                  name === m.name ? 'bg-[#5B9BD5]/10 font-bold' : ''
                                }`}>
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  name === m.name ? 'bg-[#1E6F9F] text-white' : 'bg-[#5B9BD5]/20 text-[#1E6F9F]'
                                }`}>
                                  {initials(m.name)}
                                </div>
                                <p className={`text-sm ${name === m.name ? 'text-[#1B2838]' : 'text-[#1B2838] font-medium'}`}>{m.name}</p>
                                {name === m.name && <Check size={14} className="ml-auto text-[#1E6F9F]" />}
                              </button>
                            ))}
                          </div>
                        );
                      }) : nameSearch.trim() && (
                        <div className="px-4 py-4 text-center text-xs text-[#5B6F88]">
                          Will be added as a new member: "<span className="font-bold text-[#1B2838]">{nameSearch}</span>"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1B2838]">
                  <Phone size={14} className="text-[#5B9BD5]" /> M-Pesa number
                </label>
                <input
                  type="tel"
                  placeholder="07XX XXX XXX"
                  value={phone}
                  onChange={e => setPhone(formatPhone(e.target.value))}
                  className="w-full rounded-xl border border-[#2C4056]/20 bg-white px-4 py-3 text-sm text-[#1B2838] outline-none transition focus:border-[#1E6F9F] placeholder:text-[#5B6F88]/40"
                />
                <p className="mt-1 text-xs text-[#5B6F88]">You will receive an M-Pesa prompt to enter your PIN</p>
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#1B2838]">
                  <MessageSquare size={14} className="text-[#5B9BD5]" /> Message <span className="font-normal text-[#5B6F88]">(optional)</span>
                </label>
                <textarea
                  placeholder={isGeneral ? 'With thanksgiving for...' : `In honour of ${member.name}...`}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#2C4056]/20 bg-white px-4 py-3 text-sm text-[#1B2838] outline-none transition focus:border-[#1E6F9F] placeholder:text-[#5B6F88]/40 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={processDonation}
                disabled={!name.trim() || (!amount && !customAmount)}
                className="btn-lift w-full rounded-full bg-[#1B2838] py-3.5 text-base font-bold text-white shadow-sm hover:bg-[#3B5A7A] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isGeneral
                  ? `Honour with KES ${(amount === 'custom' ? Number(customAmount) || 0 : amount || 0).toLocaleString()} via M-Pesa`
                  : `Honour ${member.name} with KES ${(amount === 'custom' ? Number(customAmount) || 0 : amount || 0).toLocaleString()}`}
              </button>

              <div className="rounded-xl border border-[#2C4056]/10 bg-[#5B9BD5]/5 p-4 text-center">
                <p className="text-xs font-bold text-[#1E6F9F] uppercase tracking-wider">Or pay directly via M-Pesa Paybill</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-[#1B2838]">835 872</p>
                <div className="mx-auto mt-1 inline-flex items-center gap-1 rounded-full bg-[#5B9BD5]/10 px-4 py-1.5">
                  <span className="text-xs text-[#5B6F88]">Account:</span>
                  <span className="text-xs font-bold text-[#1B2838]">Your Name</span>
                </div>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#5B9BD5]/20">
                <Loader2 size={32} className="animate-spin text-[#1E6F9F]" />
              </div>
              <h3 className="text-lg font-bold text-[#1B2838]">
                {isGeneral ? 'Processing your honour gift...' : `Honouring ${member.name}...`}
              </h3>
              <p className="mt-2 text-sm text-[#5B6F88]">Check your phone for the M-Pesa PIN prompt</p>
              <p className="mt-1 text-sm font-semibold text-[#1E6F9F]">KES {finalAmount.toLocaleString()}</p>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#2C4056]/10">
                <div className="animate-progress-shine h-full w-full rounded-full bg-[#1E6F9F]/30" />
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 animate-bounce-in items-center justify-center rounded-full bg-[#1E6F9F]">
                <Check size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#1B2838]">
                Asante sana{finalDonorName ? `, ${finalDonorName}` : ''}!
              </h3>
              <p className="mt-2 text-sm text-[#5B6F88]">
                {isGeneral
                  ? `Your honour gift of KES ${finalAmount.toLocaleString()} has been received.`
                  : `Your honour gift of KES ${finalAmount.toLocaleString()} for ${member.name} has been received.`}
              </p>
              {!isGeneral && (
                <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-[#5B9BD5]/10 px-4 py-1.5">
                  <Heart size={12} className="text-[#1E6F9F]" />
                  <span className="text-xs font-bold text-[#1E6F9F]">In honour of {member.name}</span>
                </div>
              )}
              {receiptNumber && (
                <p className="mt-3 font-mono text-xs text-[#5B6F88]">Receipt: {receiptNumber}</p>
              )}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={reset}
                  className="btn-lift flex-1 rounded-full border border-[#2C4056]/20 px-5 py-2.5 text-sm font-bold text-[#5B6F88] hover:border-[#1E6F9F] hover:text-[#1E6F9F]"
                >
                  Give Again
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
