import { useState, useEffect } from 'react';
import { Heart, Medal, Gift, Users, ArrowLeft, Edit3, DollarSign, X, Check } from 'lucide-react';

interface PortfolioData {
  name: string;
  pledges: any[];
  donations: any[];
  honoured: any[];
  stats: {
    total_donated: number;
    donation_count: number;
    honour_count: number;
    honour_total: number;
  };
}

interface Props {
  name: string;
  onClose: () => void;
}

export default function PersonalPortfolio({ name, onClose }: Props) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingPledge, setEditingPledge] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editFreq, setEditFreq] = useState('');
  const [payingPledge, setPayingPledge] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payReceipt, setPayReceipt] = useState('');

  function load() {
    setLoading(true);
    fetch(`/api/reminders/portfolio?name=${encodeURIComponent(name)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [name]);

  async function handleModify(pledgeId: string) {
    const body: any = {};
    if (editAmount) body.amount = Number(editAmount);
    if (editFreq) body.reminder_freq = editFreq;
    await fetch(`/api/pledges/${pledgeId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setEditingPledge(null); setEditAmount(''); setEditFreq('');
    load();
  }

  async function handlePay(pledgeId: string) {
    if (!payAmount) return;
    await fetch(`/api/pledges/${pledgeId}/pay`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(payAmount), receipt_number: payReceipt || null }),
    });
    setPayingPledge(null); setPayAmount(''); setPayReceipt('');
    load();
  }

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg animate-pulse rounded-2xl bg-white p-8 text-center shadow-xl">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100" />
        <div className="mx-auto mb-2 h-4 w-32 rounded bg-gray-200" />
        <div className="mx-auto h-3 w-48 rounded bg-gray-100" />
      </div>
    </div>
  );

  if (!data) return null;

  const s = data.stats;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 text-white">
          <div className="mb-3 flex items-center justify-between">
            <button onClick={onClose} className="flex items-center gap-1 text-sm text-blue-100 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white shadow-lg">
              {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold">{name}</h2>
              <p className="text-sm text-blue-200">Personal Contribution Portfolio</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-6 pt-6">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-center">
            <Gift size={18} className="mx-auto mb-1 text-blue-600" />
            <p className="text-2xl font-bold text-gray-900">KES {s.total_donated.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{s.donation_count} donation{s.donation_count !== 1 ? 's' : ''}</p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center">
            <Medal size={18} className="mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-gray-900">{s.honour_count}</p>
            <p className="text-xs text-gray-500">time{s.honour_count !== 1 ? 's' : ''} honoured | KES {s.honour_total.toLocaleString()}</p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-4 space-y-5 max-h-[60vh] overflow-y-auto">
          {data.pledges.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                <Heart size={14} className="text-red-400" /> Pledges
              </h3>
              <div className="space-y-2">
                {data.pledges.map((p: any) => {
                  const pct = p.amount > 0 ? Math.min(100, Math.round((p.paid / p.amount) * 100)) : 0;
                  return (
                    <div key={p.id} className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-gray-900">KES {p.amount.toLocaleString()}</p>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            p.status === 'fulfilled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{p.status}</span>
                          {p.status !== 'fulfilled' && (
                            <>
                              <button onClick={() => { setEditingPledge(p.id); setEditAmount(''); setEditFreq(p.reminder_freq || ''); }} className="rounded p-1 text-blue-500 hover:bg-blue-50"><Edit3 size={14} /></button>
                              <button onClick={() => { setPayingPledge(p.id); setPayAmount(''); setPayReceipt(''); }} className="rounded p-1 text-green-500 hover:bg-green-50"><DollarSign size={14} /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        <span>Paid: KES {p.paid.toLocaleString()}</span>
                        <span>Left: KES {p.remaining.toLocaleString()}</span>
                        <span className="text-gray-400">{p.reminder_freq || '—'} reminders</span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>

                      {editingPledge === p.id && (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2">
                          <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}
                            placeholder="New amount (KES)" className="w-full rounded-lg border border-blue-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
                          <select value={editFreq} onChange={e => setEditFreq(e.target.value)}
                            className="w-full rounded-lg border border-blue-200 px-3 py-2 text-xs outline-none focus:border-blue-500">
                            <option value="">No change</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                          <div className="flex gap-2">
                            <button onClick={() => handleModify(p.id)} className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700">Save</button>
                            <button onClick={() => setEditingPledge(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                          </div>
                        </div>
                      )}

                      {payingPledge === p.id && (
                        <div className="mt-3 rounded-lg border border-green-100 bg-green-50 p-3 space-y-2">
                          <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                            placeholder="Amount to pay (KES)" className="w-full rounded-lg border border-green-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                          <input type="text" value={payReceipt} onChange={e => setPayReceipt(e.target.value)}
                            placeholder="Receipt / M-Pesa code (optional)" className="w-full rounded-lg border border-green-200 px-3 py-2 text-xs outline-none focus:border-green-500" />
                          <div className="flex gap-2">
                            <button onClick={() => handlePay(p.id)} className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700">Record Payment</button>
                            <button onClick={() => setPayingPledge(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-100">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.donations.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                <Gift size={14} className="text-green-500" /> My Donations
              </h3>
              <div className="space-y-1.5">
                {data.donations.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-bold text-gray-900">KES {Number(d.amount).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right text-xs text-gray-400">
                      {d.receipt_number && <p className="font-mono">{d.receipt_number}</p>}
                      {d.phone && <p>{d.phone}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.honoured.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-gray-700">
                <Users size={14} className="text-amber-500" /> People Who Honoured Me
              </h3>
              <div className="space-y-1.5">
                {data.honoured.map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Medal size={14} className="text-amber-400" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{h.donor_name || 'Anonymous'}</p>
                        <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleDateString()}</p>
                        {h.phone && <p className="text-[10px] text-gray-400">{h.phone}</p>}
                      </div>
                    </div>
                    <span className="text-sm font-bold text-amber-700">KES {Number(h.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!data.pledges.length && !data.donations.length && !data.honoured.length && (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">No records found for this name</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
