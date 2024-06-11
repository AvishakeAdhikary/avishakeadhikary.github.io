import Image from "next/image";
import { MacbookScroll } from "./components/ui/macbook-scroll";
import Hero from "./containers/(home)/home-hero-section";
import ProjectsParallax from "./containers/(home)/home-projects";
import SkillsSection from "./containers/(home)/home-skills";
import ResumeDownloadButton from "./components/ui/resume-download-button";
import Highlights from "./containers/(home)/home-highlights";




export default function Home() {
  return (
    <main className="dark">
      <Hero />
      <SkillsSection />
      <ProjectsParallax />
      {/* <MacbookScroll src="/images/gallery/MCAGrad.jpg" title="I've graduated from Amity University" showGradient={true}/> */}
      <Highlights />
      <ResumeDownloadButton />
    </main>
  );
}
