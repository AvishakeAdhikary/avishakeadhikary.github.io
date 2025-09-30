"use client";
import React from "react";
import { HoverBorderGradient } from "./hover-border-gradient";
import Image from "next/image";
import Link from "next/link";

export default function ResumeDownloadButton() {
  return (
    <div className="fixed bottom-0 right-0 p-2" style={{zIndex: 10000}}>
        <Link href={"/data/AvishakeAdhikaryResume.pdf"} target="_blank" download>
            <HoverBorderGradient
                containerClassName="rounded-full"
                as="button"
                className="flex items-center space-x-2"
            >
                <Image src={"/images/icons/file-download.svg"} alt={"Resume Download"} width={20} height={20}/>
                <span>Download Resume</span>
            </HoverBorderGradient>
        </Link>
    </div>
  );
}