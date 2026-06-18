import { useEffect, useState } from 'react';

const IMAGES = [
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

  return (
    <>
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className={`fixed inset-0 bg-cover bg-center transition-all duration-1000 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover' }}
        >
          <div className="absolute inset-0 animate-ken-burns" style={{ backgroundImage: `url(${src})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        </div>
      ))}
      <div className="fixed inset-0 bg-gradient-to-b from-[#1f2a1d]/75 via-[#1f2a1d]/50 to-[#1f2a1d]/85" />
      <div className="fixed inset-0 bg-gradient-to-r from-[#1f2a1d]/30 to-transparent" />
      <div className="fixed top-20 right-10 h-72 w-72 rounded-full bg-[#85AB8B]/8 blur-3xl" />
      <div className="fixed bottom-20 left-10 h-96 w-96 rounded-full bg-[#85AB8B]/5 blur-3xl" />
    </>
  );
}
