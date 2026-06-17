"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import ArchProgress from "./ArchProgress";

interface HeroProps {
  raised: number;
  goal: number;
}

export default function Hero({ raised, goal }: HeroProps) {
  const scrollToGive = () => {
    document.getElementById("give")?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToAbout = () => {
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-maroon/90 via-magenta/70 to-ink/95" />

      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
        style={{
          backgroundImage: "url('/images/church-bg.svg')",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6"
        >
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.3em] text-gold">
            Karibu &bull; Harambee 2026
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-cream md:text-6xl">
            Tujenge Pamoja
          </h1>
          <p className="mt-3 text-lg text-cream/80 md:text-xl">
            Building AIPCA Bahati Cathedral together &mdash;{" "}
            <span className="text-gold">your gift matters</span>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-8 w-full max-w-md"
        >
          <ArchProgress raised={raised} goal={goal} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <button
            onClick={scrollToGive}
            className="rounded-full bg-gold px-10 py-4 text-lg font-bold text-ink shadow-lg shadow-gold/20 transition hover:bg-gold/90 hover:shadow-gold/30"
          >
            Toa Sasa &rarr;
          </button>
          <button
            onClick={scrollToAbout}
            className="rounded-full border border-cream/30 bg-cream/10 px-10 py-4 text-lg font-medium text-cream backdrop-blur-sm transition hover:bg-cream/20"
          >
            Learn More
          </button>
        </motion.div>
      </div>

      <button
        onClick={scrollToGive}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-cream/50 transition hover:text-cream"
        aria-label="Scroll down"
      >
        <ChevronDown size={32} />
      </button>
    </section>
  );
}
