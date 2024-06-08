import { HeroParallax } from "@/app/components/ui/hero-parallax";
import { projects } from "../../../../../public/data/projects";

export default function ProjectsParallax () {
    return (
        <HeroParallax products={projects} />
    );
}