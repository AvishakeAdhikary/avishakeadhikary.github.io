"use client";
import { SparklesCore } from "@/components/ui/sparkles";
import React from "react";

export default function GalleryHeader() {
  return (
    <div className="h-[40rem] w-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-md px-4">
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20">
        Gallery
      </h1>
      <div className="w-full max-w-[40rem] h-40 relative">
        {/* Gradients */}
        <div className="absolute inset-x-[10%] top-0 bg-gradient-to-r from-transparent via-red-600 to-transparent h-[2px] w-4/5 blur-sm" />
        <div className="absolute inset-x-[10%] top-0 bg-gradient-to-r from-transparent via-red-600 to-transparent h-px w-4/5" />
        <div className="absolute inset-x-[35%] top-0 bg-gradient-to-r from-transparent via-red-400 to-transparent h-[5px] w-1/3 blur-sm" />
        <div className="absolute inset-x-[35%] top-0 bg-gradient-to-r from-transparent via-red-400 to-transparent h-px w-1/3" />

        {/* Core component */}
        <SparklesCore
          background="transparent"
          minSize={0.4}
          maxSize={1}
          particleDensity={120}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />

        {/* Radial Gradient to prevent sharp edges */}
        <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]"></div>
      </div>
    </div>
  );
}
