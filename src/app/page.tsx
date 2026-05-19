import dynamic from "next/dynamic";
import Hero from "./containers/(home)/home-hero-section";
import SkillsSection from "./containers/(home)/home-skills";
import Highlights from "./containers/(home)/home-highlights";
import ResumeDownloadButton from "@/components/ui/resume-download-button";

const ProjectsParallax = dynamic(
  () => import("./containers/(home)/home-projects"),
);
const RecommendationsSection = dynamic(
  () => import("./containers/(home)/home-recommendations"),
);
const LocationSection = dynamic(
  () => import("./containers/(home)/home-location"),
);
const TimelineSection = dynamic(
  () => import("./containers/(home)/home-timeline"),
);

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
