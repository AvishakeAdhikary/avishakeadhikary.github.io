"use client";
import HomeButton from "@/components/ui/home-button";
import GalleryBody from "../containers/(gallery)/gallery-body";
import GalleryHeader from "../containers/(gallery)/gallery-header";
import ResumeDownloadButton from "@/components/ui/resume-download-button";

export default function Gallery(){
    return (
        <>
            <HomeButton />
            <GalleryHeader />
            <GalleryBody />
            <ResumeDownloadButton />
        </>
    );
}