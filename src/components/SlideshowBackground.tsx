import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGES = [
  '/images/fasad_processed.jpeg',
  '/images/frame_01.jpg',
  '/images/frame_04.jpg',
  '/images/frame_23.jpg',
  '/images/frame_31.jpg',
  '/images/frame_58.jpg',
  '/images/church-opening.jpg',
];

export default function SlideshowBackground() {
  const [loaded, setLoaded] = useState<boolean[]>(IMAGES.map(() => false));
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    IMAGES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => setLoaded(prev => { const n = [...prev]; n[i] = true; return n; });
    });
  }, []);

  useEffect(() => {
    if (loaded.every(Boolean)) {
      const interval = setInterval(() => setCurrent(prev => (prev + 1) % IMAGES.length), 6000);
      return () => clearInterval(interval);
    }
  }, [loaded]);

  const goTo = useCallback((i: number) => setCurrent(((i % IMAGES.length) + IMAGES.length) % IMAGES.length), []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') goTo(current - 1);
      if (e.key === 'ArrowRight') goTo(current + 1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, current, goTo]);

  return (
    <>
      {/* Slideshow background layers */}
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className={`fixed inset-0 bg-cover bg-center transition-all duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover' }}
        >
          <div className="absolute inset-0 animate-ken-burns" style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>
      ))}
      <div className="fixed inset-0 bg-gradient-to-b from-[#1B2838]/75 via-[#1B2838]/50 to-[#1B2838]/85" />
      <div className="fixed inset-0 bg-gradient-to-r from-[#1B2838]/30 to-transparent" />
      <div className="fixed top-20 right-10 h-72 w-72 rounded-full bg-[#5B9BD5]/8 blur-3xl" />
      <div className="fixed bottom-20 left-10 h-96 w-96 rounded-full bg-[#5B9BD5]/5 blur-3xl" />

      {/* Dot navigation - interactive */}
      <div className="fixed right-6 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2">
        {IMAGES.map((src, i) => (
          <button
            key={src}
            onClick={() => goTo(i)}
            className={`h-2.5 w-2.5 rounded-full border border-white/40 transition-all duration-300 ${
              i === current ? 'scale-125 bg-white' : 'bg-white/20 hover:bg-white/50'
            }`}
            aria-label={`View image ${i + 1}`}
          />
        ))}
      </div>

      {/* Click to open lightbox */}
      <button
        onClick={() => setLightboxOpen(true)}
        className="fixed bottom-6 right-6 z-30 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm transition hover:bg-white/20 hover:text-white/80"
      >
        View Gallery
      </button>

      {/* Lightbox overlay */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={24} />
          </button>

          <button
            onClick={() => goTo(current - 1)}
            className="absolute left-4 z-50 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <ChevronLeft size={28} />
          </button>

          <button
            onClick={() => goTo(current + 1)}
            className="absolute right-16 z-50 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <ChevronRight size={28} />
          </button>

          <div className="flex max-h-[90vh] max-w-[90vw] items-center justify-center">
            <img
              src={IMAGES[current]}
              alt={`Church photo ${current + 1}`}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-2xl"
            />
          </div>

          <div className="absolute bottom-6 flex gap-2">
            {IMAGES.map((src, i) => (
              <button
                key={src}
                onClick={() => goTo(i)}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  i === current ? 'scale-125 bg-white' : 'bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
