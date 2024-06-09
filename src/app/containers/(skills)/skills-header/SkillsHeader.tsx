import React from "react";
import { FlipWords } from "@/app/components/ui/flip-words";

export function SkillsHeader() {
  const words = ["learnt", "have", "continue-to-develop"];

  return (
    <div className="h-[40rem] flex justify-center items-center px-4">
      <div className="text-4xl mx-auto">
        Skills that I <FlipWords className="text-stone-300" words={words} />.
      </div>
    </div>
  );
}
