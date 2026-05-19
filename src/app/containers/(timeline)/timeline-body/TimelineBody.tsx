"use client";
import React from "react";
import Image from "next/image";
import { TracingBeam } from "@/components/ui/tracing-beam";
import { timeline } from "../../../../../public/data/timeline";

export default function TimelineBody() {
  return (
    <TracingBeam className="px-4 sm:px-6">
      <div className="max-w-2xl mx-auto antialiased pt-4 relative">
        {timeline.map((item, index) => (
          <div key={`content-${index}`} className="mb-10">
            <h2 className="bg-red-600 text-white rounded-full text-sm w-fit px-4 py-1 mb-4">
              {item.badge}
            </h2>

            <p className="text-lg sm:text-xl mb-4">
              {item.title}
            </p>

            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              {item?.image && (
                <Image
                  src={item.image}
                  alt={item.title || "Timeline image"}
                  height={1000}
                  width={1000}
                  className="rounded-lg mb-10 object-cover w-full h-auto"
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, 672px"
                />
              )}
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </TracingBeam>
  );
}
