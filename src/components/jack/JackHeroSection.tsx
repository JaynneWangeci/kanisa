import FadeIn from "./FadeIn";
import Magnet from "./Magnet";
import ContactButton from "./ContactButton";

export default function JackHeroSection() {
  return (
    <section className="relative h-screen flex flex-col bg-[#0C0C0C] overflow-hidden" style={{ fontFamily: "'Kanit', sans-serif" }}>
      {/* Navbar */}
      <FadeIn delay={0} y={-20} duration={0.7}>
        <nav className="flex items-center justify-between px-6 md:px-10 pt-6 md:pt-8 relative z-20">
          {["About", "Price", "Projects", "Contact"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-[#D7E2EA] font-medium uppercase tracking-wider text-sm md:text-lg lg:text-[1.4rem] hover:opacity-70 transition-opacity duration-200"
            >
              {link}
            </a>
          ))}
        </nav>
      </FadeIn>

      {/* Hero heading */}
      <div className="flex-1 flex flex-col justify-center overflow-hidden">
        <div className="overflow-hidden">
          <FadeIn delay={0.15} y={40} duration={0.7}>
            <h1
              className="hero-heading font-black uppercase tracking-tight leading-none whitespace-nowrap w-full mt-6 sm:mt-4 md:-mt-5"
              style={{ fontSize: "clamp(14vw, 15vw, 17.5vw)" }}
            >
              Hi, i&apos;m jack
            </h1>
          </FadeIn>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex items-end justify-between pb-7 sm:pb-8 md:pb-10 px-6 md:px-10 relative z-20">
        <FadeIn delay={0.35} y={20} duration={0.7}>
          <p
            className="text-[#D7E2EA] font-light uppercase tracking-wide leading-snug max-w-[160px] sm:max-w-[220px] md:max-w-[260px]"
            style={{ fontSize: "clamp(0.75rem, 1.4vw, 1.5rem)" }}
          >
            a 3d creator driven by crafting striking and unforgettable projects
          </p>
        </FadeIn>
        <FadeIn delay={0.5} y={20} duration={0.7}>
          <ContactButton />
        </FadeIn>
      </div>

      {/* Portrait */}
      <FadeIn delay={0.6} y={30} duration={0.7} className="absolute left-1/2 -translate-x-1/2 z-10 top-1/2 -translate-y-1/2 sm:top-auto sm:translate-y-0 sm:bottom-0">
        <Magnet padding={150} strength={3} activeTransition="transform 0.3s ease-out" inactiveTransition="transform 0.6s ease-in-out">
          <img
            src="https://shrug-person-78902957.figma.site/_components/v2/d24c01ad3a56fc65e942a1f501eb73db42d7cf9a/Rectangle_40443.81459862.png"
            alt="Jack"
            className="w-[280px] sm:w-[360px] md:w-[440px] lg:w-[520px]"
          />
        </Magnet>
      </FadeIn>
    </section>
  );
}
