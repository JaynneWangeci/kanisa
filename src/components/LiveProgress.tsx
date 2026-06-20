import { useState, useEffect, useRef } from 'react';
import { TrendingUp, Target, Zap, ExternalLink } from 'lucide-react';
import { useInView } from '../hooks/useInView';

export default function LiveProgress() {
  const [raised, setRaised] = useState(0);
  const [goal, setGoal] = useState(30000000);
  const [displayRaised, setDisplayRaised] = useState(0);
  const [harambeeDays, setHarambeeDays] = useState(0);
  const [width, setWidth] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const { ref, inView } = useInView();
  const prevPct = useRef(0);

  const pct = Math.min((raised / goal) * 100, 100);

  useEffect(() => {
    fetch('/api/campaigns/development-fund')
      .then(r => r.ok && r.json())
      .then(data => { if (data) { setRaised(Number(data.raised ?? 0)); setGoal(Number(data.goal ?? 30000000)); } })
      .catch(() => {});
    fetch('/api/settings/harambee')
      .then(r => r.ok && r.json())
      .then(data => { if (data) setHarambeeDays(data.days_remaining); })
      .catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/campaigns/development-fund')
        .then(r => r.ok && r.json())
        .then(data => { if (data) { setRaised(Number(data.raised ?? 0)); setGoal(Number(data.goal ?? 30000000)); } })
        .catch(() => {});
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!inView) return;
    setWidth(0);
    setDisplayRaised(0);
    const duration = 1500;
    const steps = 40;
    const stepInterval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const eased = 1 - Math.pow(1 - step / steps, 3);
      setDisplayRaised(Math.round(raised * eased));
      setWidth(pct * eased);
      if (step >= steps) {
        clearInterval(timer);
        setDisplayRaised(raised);
        setWidth(pct);
      }
    }, stepInterval);
    return () => clearInterval(timer);
  }, [raised, pct, inView]);

  return (
    <section className="relative overflow-hidden bg-[#0f1a13] px-4 py-20 md:py-28">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-amber/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-amber/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.02] blur-2xl" />
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-amber/20 animate-pulse-soft"
            style={{
              top: `${15 + i * 14}%`,
              left: `${5 + (i * 17) % 90}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${2 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div ref={ref} className="relative mx-auto max-w-4xl">
        {/* Header */}
        <div className={`mb-10 text-center transition-all duration-700 ${inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber/10 px-4 py-1.5 text-xs font-bold text-amber uppercase tracking-widest">
            <TrendingUp size={12} />
            Harambee Progress
          </span>
          <h2 className="mt-4 font-heading text-3xl font-bold text-white md:text-4xl">
            Tujenge Pamoja
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
            Together we are building the house of the Lord. Every contribution brings us closer to our goal.
          </p>
        </div>

        {/* Main progress card */}
        <div className={`relative rounded-3xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-sm transition-all duration-700 delay-200 md:p-12 ${inView ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          {/* Raised & Goal display */}
          <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-xs font-medium uppercase tracking-widest text-white/40">Total Raised</p>
              <p className="mt-1 text-3xl font-bold text-white md:text-4xl tabular-nums">
                KES {displayRaised.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-widest text-white/40">Goal</p>
                <p className="mt-1 text-lg font-semibold text-white/60 md:text-xl tabular-nums">
                  KES {goal.toLocaleString()}
                </p>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 border-amber/20 bg-amber/5">
                <span className="text-2xl font-bold text-amber tabular-nums">{Math.round(pct)}%</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div ref={barRef} className="relative">
            <div className="h-4 overflow-hidden rounded-full bg-white/5 shadow-inner md:h-5">
              <div
                className="relative h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${width}%`,
                  background: 'linear-gradient(90deg, #C4964A, #D4A853, #E8C06A, #C4964A)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 3s linear infinite',
                }}
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-progress-shine" />
                {width > 15 && (
                  <div className="absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-amber bg-white shadow-lg shadow-amber/30 md:h-7 md:w-7">
                    <div className="flex h-full w-full items-center justify-center">
                      <Zap size={12} className="text-amber" />
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* Milestone markers */}
            <div className="relative mt-2 flex justify-between px-0">
              {[25, 50, 75].map(m => (
                <div key={m} className="flex flex-col items-center">
                  <div className={`h-2 w-0.5 ${pct >= m ? 'bg-amber/50' : 'bg-white/10'}`} />
                  <span className={`mt-1 text-[10px] ${pct >= m ? 'text-amber/60' : 'text-white/20'}`}>
                    KES {(goal * m / 100).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/5 pt-6">
            <div className="text-center">
              <Target size={16} className="mx-auto mb-1 text-amber" />
              <p className="text-lg font-bold text-white tabular-nums">{Math.round(pct)}%</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Complete</p>
            </div>
            <div className="text-center">
              <TrendingUp size={16} className="mx-auto mb-1 text-amber" />
              <p className="text-lg font-bold text-white tabular-nums">KES {(goal - raised > 0 ? (goal - raised) : 0).toLocaleString()}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Remaining</p>
            </div>
            <div className="text-center">
              <ExternalLink size={16} className="mx-auto mb-1 text-amber" />
              <p className="text-lg font-bold text-amber tabular-nums">{harambeeDays > 0 ? `${harambeeDays}d` : "—"}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">Days Left</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
