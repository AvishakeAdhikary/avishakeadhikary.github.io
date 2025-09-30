
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Button } from "@/components/ui/moving-border";
import Link from "next/link";

export default function SkillsSection () {
    return (
        <div className="h-screen w-full rounded-md relative flex flex-col items-center justify-center antialiased">
            <div className="max-w-2xl mx-auto p-4">
                <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text bg-gradient-to-b text-stone-50 text-center font-sans font-bold">Skills</h1>
                <br />
                <p className="text-stone-200 max-w-lg mx-auto my-2 text-sm text-center relative z-10">
                    Explore the skills that I have developed throughout the years... 
                    <br /><br />
                    <Link href={"/skills"}><Button>Explore Now</Button></Link>
                </p>
            </div>
            <BackgroundBeams />
        </div>
    )
}
