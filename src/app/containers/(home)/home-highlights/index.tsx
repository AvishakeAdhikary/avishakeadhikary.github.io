"use client";
import { motion } from "framer-motion";
import { HeroHighlight, Highlight } from "@/app/components/ui/hero-highlight";

export default function Highlights () {
    return (
        <HeroHighlight>
          <motion.h1
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: [20, -5, 0],
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0.0, 0.2, 1],
            }}
            className="text-2xl px-4 md:text-4xl lg:text-5xl font-bold max-w-4xl leading-relaxed lg:leading-snug text-center mx-auto "
          >
            I have knowledge of{" "}
            <Highlight>
              30+ Programming Languages
            </Highlight>
            <br />
            <br />
            I have knowledge of{" "}
            <Highlight>
              10+ Frameworks
            </Highlight>
            <br />
            <br />
            I have achieved {" "}  
            <Highlight>
              50+ Certifications
            </Highlight>
            <br />
            <br />
            I published{" "}
            <Highlight>
              5+ Research Papers
            </Highlight>
          </motion.h1>
        </HeroHighlight>
      );
}