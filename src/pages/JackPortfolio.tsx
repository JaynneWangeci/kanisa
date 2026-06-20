import { useEffect } from "react";
import JackHeroSection from "../components/jack/JackHeroSection";
import MarqueeSection from "../components/jack/MarqueeSection";
import AboutSection from "../components/jack/AboutSection";
import ServicesSection from "../components/jack/ServicesSection";
import ProjectsSection from "../components/jack/ProjectsSection";

export default function JackPortfolio() {
  useEffect(() => {
    document.title = "Jack — 3D Creator";
    const html = document.documentElement;
    const body = document.body;
    html.style.backgroundColor = "#0C0C0C";
    body.style.backgroundColor = "#0C0C0C";
    body.style.fontFamily = "'Kanit', sans-serif";
    body.style.WebkitFontSmoothing = "antialiased";
    body.style.boxSizing = "border-box";
    body.style.margin = "0";
    body.style.padding = "0";
    return () => {
      html.style.backgroundColor = "";
      body.style.backgroundColor = "";
      body.style.fontFamily = "";
      body.style.WebkitFontSmoothing = "";
    };
  }, []);

  return (
    <div style={{ overflowX: "clip", backgroundColor: "#0C0C0C", minHeight: "100vh" }}>
      <JackHeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
    </div>
  );
}
