import { AnimatedTooltip } from "@/app/components/ui/animated-tooltip";
import { BackgroundBeams } from "@/app/components/ui/background-beams";


const skills = [
    {
        id: 1,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
];

export default function SkillsSection () {
    return (
        <div className="h-[40rem] w-full rounded-md relative flex flex-col items-center justify-center antialiased">
            <div className="max-w-2xl mx-auto p-4">
                <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b text-stone-50 text-center font-sans font-bold">Skills</h1>
                <p></p>
                <p className="text-stone-200 max-w-lg mx-auto my-2 text-sm text-center relative z-10">
                    Explore the skills that I have developed throughout the years...
                    <AnimatedTooltip items={skills} />
                </p>
            </div>
            <BackgroundBeams />
        </div>
    )
}
