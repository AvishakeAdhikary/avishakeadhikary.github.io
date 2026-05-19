"use client";
import React from "react";
import { FlipWords } from "@/components/ui/flip-words";

export function SkillsHeader() {
  const words = ["learnt", "have", "continue-to-develop"];

  return (
    <div className="min-h-[24rem] sm:min-h-[40rem] flex justify-center items-center px-4">
      <div className="text-2xl sm:text-3xl md:text-4xl mx-auto text-center">
        Skills that I <FlipWords className="text-red-500" words={words} />.
      </div>
    </div>
  );
}
