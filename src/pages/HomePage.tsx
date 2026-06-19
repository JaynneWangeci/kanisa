import SlideshowBackground from "../components/SlideshowBackground";
import ChurchHero from "../components/ChurchHero";
import LiveProgress from "../components/LiveProgress";
import AboutSection from "../components/AboutSection";
import ContributeSection from "../components/ContributeSection";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <SlideshowBackground />
      <div className="relative z-10">
        <ChurchHero />
        <LiveProgress />
        <AboutSection />
        <ContributeSection />
        <Footer />
      </div>
    </main>
  );
}
