import { Heart, Church, Shield } from "lucide-react";
import { useLang } from "../context/LanguageContext";

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="bg-[#1B2838] backdrop-blur-sm px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <Church size={18} className="text-[#5B9BD5]" />
              <span className="font-heading text-lg font-bold text-white">AIPCA Bahati Cathedral</span>
            </div>
            <p className="mt-1 text-sm text-white/50">
              {t("Tujenge Pamoja — 2026 Harambee Development Fund", "Tujenge Pamoja — Mfuko wa Maendeleo wa Harambee 2026")}
            </p>
          </div>

          <div className="flex items-center gap-6">
            <a href="#about" className="text-sm text-white/50 transition hover:text-[#5B9BD5]">
              {t("About", "Kuhusu")}
            </a>
            <a href="#contribute" className="text-sm text-white/50 transition hover:text-[#5B9BD5]">
              {t("Contribute", "Changia")}
            </a>
            <a href="#give" className="flex items-center gap-1 text-sm font-semibold text-[#5B9BD5] transition hover:text-[#3A5A7A]">
              <Heart size={14} />
              {t("Give", "Toa")}
            </a>
          </div>

          <div className="flex items-center gap-4">
            <a href="/admin/login" className="flex items-center gap-1 text-sm text-white/30 transition hover:text-white/60">
              <Shield size={14} />
              {t("Admin", "Msimamizi")}
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 text-center">
          <p className="text-sm text-white/30">
            &copy; {new Date().getFullYear()} AIPCA Bahati Cathedral. {t("All rights reserved.", "Haki zote zimehifadhiwa.")}
          </p>
        </div>
      </div>
    </footer>
  );
}
