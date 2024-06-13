"use client";

import React, { useEffect, useState } from "react";
import { InfiniteMovingCards } from "@/app/components/ui/infinite-moving-cards";
import { recommendations } from "../../../../../public/data/recommendations";
import { Button } from "@/app/components/ui/moving-border";
import Link from "next/link";

export default function RecommendationsSection() {
  return (
    <div className="h-[40rem] rounded-md flex flex-col antialiased items-center justify-center relative overflow-hidden">
      <InfiniteMovingCards
        items={recommendations}
        direction="right"
        speed="slow"
      />
      <div className="mt-4 w-full flex justify-evenly">
        <Link href={"/contact-me"}><Button>Contact-Me</Button></Link>
        <Link href={"/gallery"}><Button>View Gallery</Button></Link>
      </div>
    </div>
  );
}


