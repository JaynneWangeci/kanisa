import { useState, useEffect } from 'react';
import { Medal, Search, Heart, ExternalLink } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import PersonalPortfolio from './PersonalPortfolio';

interface Pledge {
  id: string;
  donor_name: string;
  amount: number;
  paid: number;
  remaining: number;
  status: string;
  rating: number;
  color_hex: string;
}

function stars(rating: number) {
  const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= rating ? colors[rating - 1] : '#D1D5DB', fontSize: 10 }}>★</span>
      ))}
    </div>
  );
}

export default function PledgeBoard() {
  const { t } = useLang();
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ pledges: Pledge[]; donated: any[]; honoured: any[] } | null>(null);
  const [portfolioName, setPortfolioName] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/pledges')
      .then(r => r.ok && r.json())
      .then(d => { if (d?.pledges) setPledges(d.pledges); })
      .catch(() => {});
  }, []);

  async function handleSearch() {
    if (!search.trim()) { setResult(null); return; }
    const res = await fetch(`/api/pledges/search/name?q=${encodeURIComponent(search.trim())}`);
    if (res.ok) setResult(await res.json());
  }

  return (
    <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-4 py-1.5 text-xs font-bold text-blue-700 uppercase tracking-widest">
            <Medal size={12} /> {t('Pledge Progress', 'Maendeleo ya Ahadi')}
          </span>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">{t('See who has pledged and track fulfilment', 'Tazama walioahidi na fuatilia utimilizwaji')}</h2>

          {/* Search individual */}
          <div className="mx-auto mt-4 max-w-md">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder={t('Search your name...', 'Tafuta jina lako...')}
                className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 outline-none focus:border-blue-500" />
            </div>
            {result && (
              <div className="mt-3 rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-500 uppercase">{t('Your Profile', 'Wasifu Wako')}</p>
                  <button onClick={() => setPortfolioName(search.trim())}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    <ExternalLink size={12} /> {t('Full Portfolio', 'Wasifu Kamili')}
                  </button>
                </div>
                {result.pledges.length > 0 && result.pledges.map(p => (
                  <div key={p.id} className="mb-2 rounded-lg bg-blue-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-900">{p.donor_name}</p>
                      {stars(p.rating)}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-gray-600">
                      <span>{t('Pledged:', 'Ameahidi:')} KES {p.amount.toLocaleString()}</span>
                      <span>{t('Paid:', 'Amelipa:')} KES {p.paid.toLocaleString()}</span>
                      <span className="font-bold text-blue-600">{t('Remaining:', 'Inabaki:')} KES {p.remaining.toLocaleString()}</span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, (p.paid / p.amount) * 100)}%` }} />
                    </div>
                    {p.status === 'fulfilled' && <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">{t('Fulfilled ✓', 'Imekamilika ✓')}</span>}
                  </div>
                ))}
                {result.donations?.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-bold text-gray-500">{t('Your Donations', 'Michango Yako')}</p>
                    {result.donations.map((d: any) => (
                      <div key={d.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                        <span className="text-xs text-gray-700">{d.donor_name || t('Anonymous', 'Hakujulikana')}</span>
                        <span className="text-xs font-bold text-gray-900">KES {Number(d.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.honoured?.length > 0 && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs font-bold text-gray-500">{t('People who honoured you', 'Watu waliokuheshimu')}</p>
                    {result.honoured.map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Heart size={12} className="text-amber-500" />
                          <span className="text-xs text-gray-700">{h.donor_name || t('Anonymous', 'Hakujulikana')}</span>
                        </div>
                        <span className="text-xs font-bold text-amber-700">KES {Number(h.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!result.pledges.length && !result.donations?.length && !result.honoured?.length && (
                  <p className="text-xs text-gray-400">{t('No records found for this name', 'Hakuna rekodi zilizopatikana kwa jina hili')}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Public pledge board */}
        <div className="max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          {pledges.map((p, i) => {
            const pct = Math.min(100, Math.round((p.paid / p.amount) * 100));
            const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];
            const barColor = colors[p.rating - 1] || '#3B82F6';
            return (
              <div key={p.id} className={`flex items-center gap-4 px-5 py-4 ${i < pledges.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: barColor }}>
                  {p.donor_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">{p.donor_name}</p>
                    {stars(p.rating)}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <span>{t('Pledged', 'Ameahidi')}: KES {p.amount.toLocaleString()}</span>
                    <span>{t('Paid', 'Amelipa')}: KES {p.paid.toLocaleString()}</span>
                    <span className="font-bold text-blue-600">{t('Left', 'Inabaki')}: KES {p.remaining.toLocaleString()}</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-bold" style={{ color: barColor }}>{pct}%</p>
                  {p.status === 'fulfilled' && <span className="text-xs font-bold text-green-600">{t('Done ✓', 'Imekamilika ✓')}</span>}
                </div>
              </div>
            );
          })}
          {!pledges.length && (
            <div className="py-12 text-center">
              <Medal size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">{t('No pledges yet. Be the first!', 'Hakuna ahadi bado. Kuwa wa kwanza!')}</p>
            </div>
          )}
        </div>
      </div>

      {portfolioName && (
        <PersonalPortfolio name={portfolioName} onClose={() => setPortfolioName(null)} />
      )}
    </section>
  );
}
