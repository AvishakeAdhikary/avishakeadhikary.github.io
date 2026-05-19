"use client";
import React from "react";
import { HoverBorderGradient } from "./hover-border-gradient";
import Image from "next/image";
import Link from "next/link";

export default function ResumeDownloadButton() {
  return (
    <div className="fixed bottom-0 right-0 p-2 sm:p-3" style={{ zIndex: 10000 }}>
      <Link
        href={"/data/AvishakeAdhikaryResume.pdf"}
        target="_blank"
        download
        aria-label="Download resume"
      >
        <HoverBorderGradient
          containerClassName="rounded-full"
          as="button"
          className="flex items-center space-x-2 text-xs sm:text-sm"
        >
          <Image
            src={"/images/icons/file-download.svg"}
            alt={""}
            width={20}
            height={20}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Download Resume</span>
          <span className="sm:hidden">Resume</span>
        </HoverBorderGradient>
      </Link>
    </div>
  );
}
