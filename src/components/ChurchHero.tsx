import { useState, useEffect } from 'react';
import { Heart, Menu, X } from 'lucide-react';
import DonationModal from './DonationModal';

export default function ChurchHero() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGive, setShowGive] = useState(false);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const navLinks = [
    { href: '#about', label: 'About' },
    { href: '#contribute', label: 'Contribute' },
  ];

  return (
    <>
      {/* Navigation */}
      <nav className="relative z-30 flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-6">
        <div className="flex items-center gap-2 text-white/95">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#85AB8B]/20 backdrop-blur-sm border border-white/20">
            <img src="/images/a.jpeg" alt="AIPCA" className="h-8 w-8 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <span className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight" style={{ fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif' }}>
            AIPCA<sup className="text-[10px] sm:text-xs font-medium ml-0.5">®</sup>
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-1 bg-white/15 backdrop-blur-md rounded-full pl-6 pr-1 py-1 shadow-sm border border-white/20">
          {navLinks.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm px-3 py-2 transition-colors ${
                i === 0 ? 'font-semibold text-white' : 'font-medium text-white/70 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#contribute"
            className="ml-2 bg-white hover:bg-white/90 text-[#1f2a1d] text-sm font-semibold px-5 py-2.5 rounded-full transition-colors"
            onClick={(e) => { e.preventDefault(); setShowGive(true); }}
          >
            Give Now
          </a>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 text-white/95">
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white transition-all duration-300 hover:bg-white/25"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            <Menu className={`w-5 h-5 absolute transition-all duration-300 ${menuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'}`} />
            <X className={`w-5 h-5 absolute transition-all duration-300 ${menuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`lg:hidden fixed inset-0 z-20 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-[#1f2a1d]/60 backdrop-blur-sm" />
      </div>

      {/* Mobile menu drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-20 w-[85%] max-w-sm bg-[#1f2a1d]/95 backdrop-blur-xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-24 px-8 pb-8">
          <div className="flex items-center gap-3 mb-10">
            <img src="/images/a.jpeg" alt="" className="h-10 w-10 rounded-full object-cover border border-white/20" />
            <div>
              <p className="text-white font-semibold text-sm">AIPCA Bahati</p>
              <p className="text-white/50 text-xs">Harambee 2026</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {navLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-2xl font-semibold text-white py-4 border-b border-white/10 transition-all duration-500 ${
                  menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? `${150 + i * 70}ms` : '0ms' }}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div
            className={`mt-8 flex flex-col gap-4 transition-all duration-500 ${
              menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}
            style={{ transitionDelay: menuOpen ? '400ms' : '0ms' }}
          >
            <a
              href="#contribute"
              onClick={(e) => { e.preventDefault(); setMenuOpen(false); setShowGive(true); }}
              className="mt-2 bg-[#85AB8B] hover:bg-[#6d9a74] text-[#1f2a1d] text-sm font-semibold px-5 py-3 rounded-full transition-colors text-center"
            >
              Give Now
            </a>
          </div>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex flex-col items-center text-center pt-12 sm:pt-16 md:pt-20 px-4 sm:px-6 pb-8">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-xs font-semibold tracking-widest text-[#85AB8B] uppercase border border-white/10">
            <Heart size={12} />
            2026 Harambee · Tujenge Pamoja
          </span>
        </div>
        <h1
          className="font-normal leading-[0.95] text-white text-[2rem] sm:text-4xl md:text-5xl lg:text-[4.75rem] xl:text-[5.25rem] max-w-5xl mt-6"
          style={{ fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif', letterSpacing: '-0.035em' }}
        >
          AIPCA{' '}
          <span className="text-[#85AB8B]">
            Bahati
            <br className="hidden sm:block" /> Cathedral
          </span>
        </h1>
        <p className="mt-6 sm:mt-8 text-white/70 text-sm sm:text-base md:text-lg leading-relaxed max-w-md px-2">
          <span className="italic text-[#85AB8B]/80">&ldquo;Unless the Lord builds the house, its builders labour in vain.&rdquo;</span>
          <br />
          <span className="text-white/50">Psalm 127:1</span>
        </p>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-10 flex items-center justify-center px-4 pb-8">
        <button
          onClick={() => setShowGive(true)}
          className="bg-white hover:bg-white/90 text-[#1f2a1d] text-sm font-semibold px-5 sm:px-6 py-2.5 sm:py-3 rounded-full transition-colors shadow-sm"
        >
          Give to the Harambee
        </button>
      </div>

      {showGive && (
        <DonationModal
          member={{ id: 'general', name: '', role: '', council: '', photo_url: null }}
          onClose={() => setShowGive(false)}
        />
      )}
    </>
  );
}
