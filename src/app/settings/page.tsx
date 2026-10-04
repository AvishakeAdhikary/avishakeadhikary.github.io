import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";

export const metadata: Metadata = {
  title: "Settings",
  description: "Turn music, animations, effects and interface details on or off.",
  alternates: { canonical: "/settings/" },
  robots: { index: false },
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" sub="config.json" intro="Make the site yours: pick the music, calm the motion, or switch off the effects. Changes apply instantly and are saved in this browser." />
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <SettingsPanel />
      </div>
    </>
  );
}
