"use client";
import React, { useMemo } from "react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useLowPower } from "@/lib/use-low-power";

const World = dynamic(
  () => import("@/components/ui/globe").then((m) => m.World),
  { ssr: false },
);

const globeConfig = {
  pointSize: 4,
  globeColor: "#0a0a0a",
  showAtmosphere: true,
  atmosphereColor: "#ef4444",
  atmosphereAltitude: 0.1,
  emissive: "#7f1d1d",
  emissiveIntensity: 0.15,
  shininess: 0.9,
  polygonColor: "rgba(239,68,68,0.95)",
  ambientLight: "#ef4444",
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

const COLORS = ["#ef4444", "#dc2626", "#f87171"];

const LocationFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div
      className="aspect-square w-3/4 max-w-sm rounded-full border border-red-700/40"
      style={{
        background:
          "radial-gradient(circle at 30% 30%, rgba(239,68,68,0.4), rgba(127,29,29,0.25) 40%, transparent 70%), radial-gradient(circle at 70% 70%, rgba(220,38,38,0.25), transparent 60%)",
      }}
      aria-hidden="true"
    />
  </div>
);

export default function LocationSection() {
  const lowPower = useLowPower();

  const kolkataArcs = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        order: index + 1,
        startLat: -90 + Math.random() * 180,
        startLng: -180 + Math.random() * 360,
        endLat: 22.3193,
        endLng: 88.3433,
        arcAlt: 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      })),
    [],
  );

  return (
    <div className="flex flex-row items-center justify-center py-20 h-screen md:h-auto relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto w-full relative overflow-hidden h-full md:h-[40rem] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
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
          {lowPower ? (
            <LocationFallback />
          ) : (
            <World data={kolkataArcs} globeConfig={globeConfig} />
          )}
        </div>
      </div>
    </div>
  );
}
