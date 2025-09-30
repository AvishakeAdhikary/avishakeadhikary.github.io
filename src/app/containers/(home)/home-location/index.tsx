"use client";
import React from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

const World = dynamic(() => import("@/components/ui/globe").then((m) => m.World), {
  ssr: false,
});

export default function LocationSection() {
  const globeConfig = {
    pointSize: 4,
    globeColor: "#062056",
    showAtmosphere: true,
    atmosphereColor: "#FFFFFF",
    atmosphereAltitude: 0.1,
    emissive: "#062056",
    emissiveIntensity: 0.1,
    shininess: 0.9,
    polygonColor: "rgba(0,255,0,1)",
    ambientLight: "#38bdf8",
    directionalLeftLight: "#ffffff",
    directionalTopLight: "#ffffff",
    pointLight: "#ffffff",
    arcTime: 1000,
    arcLength: 0.9,
    rings: 1,
    maxRings: 3,
    initialPosition: { lat: 22.5744, lng: 88.3629 },
    autoRotate: false,
    autoRotateSpeed: 0.5,
  };

  const colors = ["#06b6d4", "#3b82f6", "#6366f1"];

  // Define minimum and maximum latitude and longitude values
  const minLat = -90;
  const maxLat = 90;
  const minLng = -180;
  const maxLng = 180;

  // Create random arcs with start positions within the specified range
  const kolkataArcs = Array.from({ length: 20 }, (_, index) => ({
    order: index + 1,
    startLat: minLat + Math.random() * (maxLat - minLat),
    startLng: minLng + Math.random() * (maxLng - minLng),
    endLat: 22.3193,
    endLng: 88.3433,
    arcAlt: 0.5,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));

  return (
    <div className="flex flex-row items-center justify-center py-20 h-screen md:h-auto relative w-full">
      <div className="max-w-7xl mx-auto w-full relative overflow-hidden h-full md:h-[40rem] px-4">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 1,
          }}
          className="div"
        >
          <h2 className="text-center text-xl md:text-4xl font-bold">
            I am from Kolkata, India
          </h2>
          <p className="text-center text-base md:text-lg font-normal max-w-md mt-2 mx-auto">
            But, I handle projects all over the world...
          </p>
        </motion.div>
        <div className="absolute w-full bottom-0 inset-x-0 h-40 pointer-events-none select-none from-transparent dark:to-black to-white z-40" />
        <div className="absolute w-full -bottom-20 h-72 md:h-full z-10">
          <World data={kolkataArcs} globeConfig={globeConfig} />
        </div>
      </div>
    </div>
  );
}
