import { AnimatedTooltip } from "@/app/components/ui/animated-tooltip";
import { BackgroundBeams } from "@/app/components/ui/background-beams";
import { Button } from "@/app/components/ui/moving-border";


const skills = [
    {
        id: 1,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
    {
        id: 2,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
    {
        id: 3,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
    {
        id: 4,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
    {
        id: 5,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
    {
        id: 6,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
    {
        id: 7,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
    {
        id: 8,
        name: "Python",
        designation: "Programming Language",
        image: "/images/skills/python-original.svg"
    },
];

export default function SkillsSection () {
    return (
        <div className="h-screen w-full rounded-md relative flex flex-col items-center justify-center antialiased">
            <div className="max-w-2xl mx-auto p-4">
                <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text bg-gradient-to-b text-stone-50 text-center font-sans font-bold">Skills</h1>
                <br />
                <p className="text-stone-200 max-w-lg mx-auto my-2 text-sm text-center relative z-10">
                    Explore the skills that I have developed throughout the years... 
                    <br /><br />
                    <Button>Explore Now</Button>
                </p>
            </div>
            <BackgroundBeams />
        </div>
    )
}
