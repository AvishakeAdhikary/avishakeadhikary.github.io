"use client";
import { Boxes } from "@/components/ui/background-boxes";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import Image from "next/image";

export default function Hero() {
  return (
    <div className="min-h-screen relative w-full overflow-hidden flex flex-col items-center justify-center bg-black px-4">
      <div className="absolute inset-0 w-full h-full z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      <Boxes />
      <Image
        className="rounded-full relative z-20 ring-2 ring-red-600/40 sm:w-[180px] sm:h-[180px] w-[140px] h-[140px] object-cover"
        src={"/images/gallery/AvishakeAdhikaryDPCropped.jpg"}
        alt={"Avishake Adhikary"}
        width={200}
        height={200}
        priority
        sizes="(max-width: 640px) 140px, 200px"
      />
      <p className="text-center mt-2 text-neutral-300 relative z-20 text-sm sm:text-base">
        Hi there, I&apos;m
      </p>
      <TypewriterEffect
        words={[
          { text: "Avishake", className: "text-neutral-50" },
          { text: "Adhikary", className: "text-red-500" },
        ]}
      />
      <p className="text-center mt-2 text-neutral-300 relative z-20 text-xs sm:text-sm md:text-base px-4">
        Machine Learning Engineer | Full Stack Developer
      </p>
    </div>
  );
}
