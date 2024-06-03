import { Boxes } from "./components/ui/background-boxes";
import { MacbookScroll } from "./components/ui/macbook-scroll";
import { TypewriterEffect } from "./components/ui/typewriter-effect";

export default function Home() {
  return (
    <main className="dark">
      <div className="h-screen relative w-full overflow-hidden bg-slate-900 flex flex-col items-center justify-center">
        <div className="absolute inset-0 w-full h-full bg-slate-900 z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />
        <Boxes />
        <p className="text-center mt-2 text-neutral-300 relative z-20">
          Hi there, I'm
        </p>
        <TypewriterEffect words={[{text: "Avishake", className: "text-neutral-50"}, {text: "Adhikary", className: "text-neutral-50"}]} />
      </div>
      <MacbookScroll src="/images/MCAGrad.jpg" title="I've graduated from Amity University" showGradient={true}/>
    </main>
  );
}
