"use client";
import HomeButton from "@/components/ui/home-button";
import ResumeDownloadButton from "@/components/ui/resume-download-button";
import SkillsBody from "../containers/(skills)/skills-body/SkillsBody";
import { SkillsHeader } from "../containers/(skills)/skills-header/SkillsHeader";

export default function Skills(){
    return (
        <>
            <HomeButton />
            <SkillsHeader />
            <SkillsBody />
            <ResumeDownloadButton />
        </>
    )
}