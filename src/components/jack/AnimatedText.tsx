import { useRef, useEffect, useState, ReactNode } from "react";

interface AnimatedTextProps {
  text: string;
  className?: string;
}

export default function AnimatedText({ text, className = "" }: AnimatedTextProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const start = entry.intersectionRect.top / window.innerHeight;
          const p = Math.min(1, Math.max(0, 1 - start));
          setProgress(p);
        }
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowH = window.innerHeight;
      const start = 0.8 * windowH;
      const end = 0.2 * windowH;
      const raw = (windowH - rect.top - start) / (end - start);
      setProgress(Math.min(1, Math.max(0, raw)));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const chars = text.split("");

  return (
    <p ref={ref} className={className} style={{ position: "relative" }}>
      {chars.map((char, i) => {
        const charProgress = Math.min(1, Math.max(0.2, (progress * chars.length - i) / chars.length));
        return (
          <span
            key={i}
            style={{
              opacity: charProgress,
              transition: "opacity 0.15s ease-out",
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </p>
  );
}
