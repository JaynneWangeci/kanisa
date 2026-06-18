import SlideshowBackground from "../components/SlideshowBackground";
import ChurchHero from "../components/ChurchHero";
import AboutSection from "../components/AboutSection";
import ContributeSection from "../components/ContributeSection";
import LocationMap from "../components/LocationMap";
import Footer from "../components/Footer";

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <SlideshowBackground />
      <div className="relative z-10">
        <ChurchHero />
        <AboutSection />
        <ContributeSection />
        <LocationMap />
        <Footer />
      </div>
    </main>
  );
}
