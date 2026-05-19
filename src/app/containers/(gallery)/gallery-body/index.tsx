"use client";
import { ImagesSlider } from "@/components/ui/images-slider";
import { images } from "../../../../../public/data/galleryimages";
import { motion } from "motion/react";
import React from "react";


export default function GalleryBody() {
  return (
    <div className="my-12 sm:my-20 lg:my-[10rem] flex justify-center px-4">
        <ImagesSlider className="h-[26rem] sm:h-[34rem] lg:h-[40rem] w-full max-w-3xl" images={images}>
            <motion.div
                initial={{
                opacity: 0,
                y: -80,
                }}
                animate={{
                opacity: 1,
                y: 0,
                }}
                transition={{
                duration: 0.6,
                }}
                className="z-50 flex flex-col justify-center items-center px-4"
            >
                <motion.p className="font-bold text-2xl sm:text-4xl md:text-6xl text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 py-4">
                Avishake&apos;s life<br /> in a nutshell
                </motion.p>
            </motion.div>
        </ImagesSlider>
    </div>

  );
}
