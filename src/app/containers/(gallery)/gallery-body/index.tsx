"use client";
import { images } from "../../../../../public/data/galleryimages";
import { motion } from "framer-motion";
import React from "react";
import { ImagesSlider } from "@/app/components/ui/images-slider";

export default function GalleryBody() {
  return (
    <div className="my-[10rem] flex justify-center">
        <ImagesSlider className="h-[40rem] w-[50%]" images={images}>
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
                className="z-50 flex flex-col justify-center items-center"
            >
                <motion.p className="font-bold text-xl md:text-6xl text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 py-4">
                Avishake&apos;s life<br /> in a nutshell
                </motion.p>
            </motion.div>
        </ImagesSlider>
    </div>
    
  );
}
