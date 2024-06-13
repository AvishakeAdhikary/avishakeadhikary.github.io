import Hero from "./containers/(home)/home-hero-section";
import ProjectsParallax from "./containers/(home)/home-projects";
import SkillsSection from "./containers/(home)/home-skills";
import ResumeDownloadButton from "./components/ui/resume-download-button";
import Highlights from "./containers/(home)/home-highlights";
import TimelineSection from "./containers/(home)/home-timeline";
import RecommendationsSection from "./containers/(home)/home-recommendations";
import LocationSection from "./containers/(home)/home-location";




export default function Home() {
  return (
    <main className="dark">
      <Hero />
      <SkillsSection />
      <ProjectsParallax />
      <Highlights />
      <RecommendationsSection />
      <LocationSection />
      <TimelineSection />
      <ResumeDownloadButton />
    </main>
  );
}
