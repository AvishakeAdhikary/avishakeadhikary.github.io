"use client";
import React from "react";
import { motion } from "motion/react";

export default function ColourfulText({ text }: { text: string }) {
  const colors = React.useMemo(
    () => [
      "rgb(255, 255, 255)",
      "rgb(254, 226, 226)",
      "rgb(252, 165, 165)",
      "rgb(248, 113, 113)",
      "rgb(239, 68, 68)",
      "rgb(220, 38, 38)",
      "rgb(185, 28, 28)",
      "rgb(153, 27, 27)",
      "rgb(127, 29, 29)",
      "rgb(229, 229, 229)",
    ],
    [],
  );

  const [currentColors, setCurrentColors] = React.useState(colors);
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      const shuffled = [...colors].sort(() => Math.random() - 0.5);
      setCurrentColors(shuffled);
      setCount((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [colors]);

  return text.split("").map((char, index) => (
    <motion.span
      key={`${char}-${count}-${index}`}
      initial={{
        y: 0,
      }}
      animate={{
        color: currentColors[index % currentColors.length],
        y: [0, -3, 0],
        scale: [1, 1.01, 1],
        filter: ["blur(0px)", `blur(5px)`, "blur(0px)"],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 0.5,
        delay: index * 0.05,
      }}
      className="inline-block whitespace-pre font-sans tracking-tight"
    >
      {char}
    </motion.span>
  ));
}
