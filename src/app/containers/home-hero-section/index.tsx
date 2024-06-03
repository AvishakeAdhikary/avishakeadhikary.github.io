import { Boxes } from "@/app/components/ui/background-boxes";
import { TypewriterEffect } from "@/app/components/ui/typewriter-effect";

export default function Hero () {
 return (
    <div className="h-screen relative w-full overflow-hidden flex flex-col items-center justify-center">
        <div className="absolute inset-0 w-full h-full z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
        <Boxes />
        <p className="text-center mt-2 text-neutral-300 relative z-20">
          Hi there, I'm
        </p>
        <TypewriterEffect words={[{text: "Avishake", className: "text-neutral-50"}, {text: "Adhikary", className: "text-neutral-50"}]} />
      </div>
 )
}