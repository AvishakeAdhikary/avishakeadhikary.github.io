"use client";

import React from "react";
import { recommendations } from "../../../../../public/data/recommendations";
import Link from "next/link";
import { InfiniteMovingCards } from "@/components/ui/infinite-moving-cards";
import { Button } from "@/components/ui/moving-border";

export default function RecommendationsSection() {
  return (
    <div className="min-h-[40rem] py-12 rounded-md flex flex-col antialiased items-center justify-center relative overflow-hidden px-4">
      <InfiniteMovingCards
        items={recommendations}
        direction="right"
        speed="slow"
      />
      <div className="mt-6 w-full flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 items-center">
        <Button>
          <Link href={"/contact-me"}>Contact-Me</Link>
        </Button>
        <Button>
          <Link href={"/gallery"}>View Gallery</Link>
        </Button>
      </div>
    </div>
  );
}
