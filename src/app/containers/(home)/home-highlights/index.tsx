"use client";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
import { motion } from "motion/react";

export default function Highlights() {
  return (
    <HeroHighlight containerClassName="min-h-[40rem] h-auto py-12 sm:py-16">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [20, -5, 0] }}
        transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
        className="text-lg sm:text-2xl md:text-4xl lg:text-5xl px-4 sm:px-6 font-bold w-full max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto break-words"
      >
        I have knowledge of{" "}
        <Highlight className="whitespace-nowrap">
          30+ Programming Languages
        </Highlight>
        <br />
        <br />
        I have knowledge of{" "}
        <Highlight className="whitespace-nowrap">10+ Frameworks</Highlight>
        <br />
        <br />
        I have achieved{" "}
        <Highlight className="whitespace-nowrap">50+ Certifications</Highlight>
        <br />
        <br />
        I published{" "}
        <Highlight className="whitespace-nowrap">5+ Research Papers</Highlight>
      </motion.h1>
    </HeroHighlight>
  );
}
