import { useState, useEffect } from "react";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

function FadeIn({ children, delay = 0, duration = 1000, className = "" }: FadeInProps) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transitionDuration: `${duration}ms`,
        transitionProperty: "opacity, transform",
        transitionTimingFunction: "ease-out",
      }}
    >
      {children}
    </div>
  );
}

function AnimatedHeading({ text, delay = 200, charDelay = 30, duration = 500 }: { text: string; delay?: number; charDelay?: number; duration?: number }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const lines = text.split("\n");

  return (
    <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-normal mb-4" style={{ letterSpacing: "-0.04em" }}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split("").map((char, ci) => {
            const totalDelay = delay + (li * line.length * charDelay) + (ci * charDelay);
            return (
              <span
                key={ci}
                className="inline-block"
                style={{
                  opacity: started ? 1 : 0,
                  transform: started ? "translateX(0)" : "translateX(-18px)",
                  transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
                  transitionDelay: `${totalDelay}ms`,
                }}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            );
          })}
          {li < lines.length - 1 && <br />}
        </span>
      ))}
    </h1>
  );
}

export default function HeroSection() {
  return (
    <section className="relative h-screen w-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260403_050628_c4e32401-fab4-4a27-b7a8-6e9291cd5959.mp4"
          type="video/mp4"
        />
      </video>

      {/* Navbar */}
      <div className="relative z-10 px-6 md:px-12 lg:px-16 pt-6">
        <div className="liquid-glass rounded-xl px-4 py-2 flex items-center justify-between">
          <div className="text-2xl font-semibold tracking-tight text-white">VEX</div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/80">
            <a href="#" className="hover:text-gray-300 transition-colors">Story</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Investing</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Building</a>
            <a href="#" className="hover:text-gray-300 transition-colors">Advisory</a>
          </div>
          <button className="bg-white text-black px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
            Start a Chat
          </button>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-12 lg:pb-16" style={{ minHeight: "calc(100vh - 80px)" }}>
        <div className="lg:grid lg:grid-cols-2 lg:items-end">
          {/* Left */}
          <div>
            <AnimatedHeading text="Shaping tomorrow\nwith vision and action." />

            <FadeIn delay={800} duration={1000}>
              <p className="text-base md:text-lg text-gray-300 mb-5">
                We back visionaries and craft ventures that define what comes next.
              </p>
            </FadeIn>

            <FadeIn delay={1200} duration={1000}>
              <div className="flex flex-wrap gap-4">
                <button className="bg-white text-black px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors">
                  Start a Chat
                </button>
                <button className="liquid-glass border border-white/20 text-white px-8 py-3 rounded-lg font-medium hover:bg-white hover:text-black transition-colors">
                  Explore Now
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Right */}
          <FadeIn delay={1400} duration={1000}>
            <div className="flex items-end justify-start lg:justify-end mt-8 lg:mt-0">
              <div className="liquid-glass border border-white/20 px-6 py-3 rounded-xl">
                <p className="text-lg md:text-xl lg:text-2xl font-light text-white">
                  Investing. Building. Advisory.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
