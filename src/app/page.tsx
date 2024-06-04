import Image from "next/image";
import { MacbookScroll } from "./components/ui/macbook-scroll";
import Hero from "./containers/home-hero-section";
import ProjectsParallax from "./containers/home-projects";
import SkillsSection from "./containers/home-skills";



export default function Home() {
  return (
    <main className="dark">
      <Hero />
      <SkillsSection />
      <ProjectsParallax />
      {/* <MacbookScroll src="/images/gallery/MCAGrad.jpg" title="I've graduated from Amity University" showGradient={true}/> */}
      
    </main>
  );
}
