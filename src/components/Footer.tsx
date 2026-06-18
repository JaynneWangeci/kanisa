import { Heart, Church, Shield } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#1f2a1d]/80 backdrop-blur-sm px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <Church size={18} className="text-amber" />
              <span className="font-heading text-lg font-bold text-white">AIPCA Bahati Cathedral</span>
            </div>
            <p className="mt-1 text-sm text-white/50">
              Tujenge Pamoja — 2026 Harambee Development Fund
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="#about"
              className="text-sm text-white/50 transition hover:text-amber"
            >
              About
            </a>
            <a
              href="#leadership"
              className="text-sm text-white/50 transition hover:text-amber"
            >
              Leadership
            </a>
            <a
              href="#give"
              className="flex items-center gap-1 text-sm font-semibold text-amber transition hover:text-amber-dark"
            >
              <Heart size={14} />
              Give
            </a>
            <a
              href="#location"
              className="text-sm text-white/50 transition hover:text-amber"
            >
              Location
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="/admin/login"
              className="flex items-center gap-1 text-sm text-white/30 transition hover:text-white/60"
            >
              <Shield size={14} />
              Admin
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-white/30">
            &copy; {new Date().getFullYear()} AIPCA Bahati Cathedral. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
