import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutSection from "@/components/AboutSection";
import ProjectsSection from "@/components/ProjectsSection";
import LeadershipSection from "@/components/LeadershipSection";
import DonationForm from "@/components/DonationForm";
import TransparencySection from "@/components/TransparencySection";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  let raised = 842500;
  let goal = 5000000;

  if (supabase) {
    try {
      const { data: campaign } = await supabase
        .from("campaigns")
        .select("raised, goal")
        .eq("slug", "development-fund")
        .single();

      if (campaign) {
        raised = Number(campaign.raised);
        goal = Number(campaign.goal);
      }
    } catch {
      // fallback defaults
    }
  }

  return (
    <>
      <Header />
      <Hero raised={raised} goal={goal} />
      <AboutSection />
      <ProjectsSection />
      <LeadershipSection />
      <DonationForm />
      <TransparencySection />
      <Footer />
    </>
  );
}
