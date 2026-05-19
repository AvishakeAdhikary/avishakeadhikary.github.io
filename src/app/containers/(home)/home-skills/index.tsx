import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/moving-border";
import Link from "next/link";

export default function SkillsSection() {
  return (
    <div className="min-h-screen w-full rounded-md relative flex flex-col items-center justify-center antialiased px-4 py-12">
      <div className="max-w-2xl mx-auto p-4 relative z-10">
        <h1 className="text-4xl md:text-6xl lg:text-7xl bg-clip-text bg-gradient-to-b text-stone-50 text-center font-sans font-bold">
          Skills
        </h1>
        <br />
        <p className="text-stone-200 max-w-lg mx-auto my-2 text-sm sm:text-base text-center">
          Explore the skills that I have developed throughout the years...
          <br />
          <br />
          <Button>
            <Link href={"/skills"}>Explore Now</Link>
          </Button>
        </p>
      </div>
      <BackgroundBeams />
    </div>
  );
}
