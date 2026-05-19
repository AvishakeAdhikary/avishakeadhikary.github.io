"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/moving-border";
import { useLowPower } from "@/lib/use-low-power";

const MacbookScroll = dynamic(
  () =>
    import("@/components/ui/macbook-scroll").then((m) => m.MacbookScroll),
);

const TimelineLite = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
    <h2 className="text-3xl sm:text-4xl font-bold text-white">
      I am a Machine Learning Engineer
    </h2>
    <p className="max-w-md text-sm sm:text-base text-neutral-300">
      Take a quick look at how my journey unfolded.
    </p>
    <Link href="/timeline">
      <Button>Explore Timeline</Button>
    </Link>
  </div>
);

export default function TimelineSection() {
  const lowPower = useLowPower();

  if (lowPower) {
    return <TimelineLite />;
  }

  return (
    <MacbookScroll
      src="/images/gallery/AvishakeAmityMCAGradMain.JPG"
      title="I am a Machine Learning Engineer"
      showGradient={true}
      buttonTitle="Explore Timeline"
      buttonLink="/timeline"
    />
  );
}
