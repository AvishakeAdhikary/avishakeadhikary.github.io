"use client";
import { HeroParallax } from "@/components/ui/hero-parallax";
import { projects } from "../../../../../public/data/projects";

export default function ProjectsParallax () {
    return (
        <HeroParallax products={projects} />
    );
}