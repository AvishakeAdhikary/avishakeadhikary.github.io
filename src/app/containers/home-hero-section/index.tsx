import { Boxes } from "@/app/components/ui/background-boxes";
import { TypewriterEffect } from "@/app/components/ui/typewriter-effect";
import Image from "next/image";

export default function Hero () {
 return (
    <div className="h-screen relative w-full overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 w-full h-full z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
      <Boxes />
      <Image className="rounded-full" src={"/images/gallery/AvishakeAdhikaryDPCropped.jpg"} alt={"Avishake Adhikary Display Picture"} width={200} height={100} />
      <p className="text-center mt-2 text-neutral-300 relative z-20">Hi there, I'm</p>
      <TypewriterEffect words={[{text: "Avishake", className: "text-neutral-50"}, {text: "Adhikary", className: "text-neutral-50"}]} />
      <p className="text-center mt-2 text-neutral-300 relative z-20">Machine Learning Engineer | Full Stack Developer</p>
    </div>
 )
}