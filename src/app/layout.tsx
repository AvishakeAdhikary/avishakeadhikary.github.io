import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { CrashController } from "@/components/crash/crash-controller";
import { Boot } from "@/components/runtime/boot";
import { Delights } from "@/components/runtime/delights";
import { Effects } from "@/components/runtime/effects";
import { Hud } from "@/components/runtime/hud";
import { Keybinds } from "@/components/runtime/keybinds";
import { Sound } from "@/components/runtime/sound";
import { Toasts } from "@/components/runtime/toasts";
import { SiteTicker } from "@/components/layout/site-ticker";
import { TerminalDock } from "@/components/terminal/terminal-dock";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { degrees, roles } from "@/content/experience";
import { profile } from "@/content/profile";
import { publications } from "@/content/publications";
import { SETTINGS_SCRIPT } from "@/lib/settings-script";
import { hud, inter, mono } from "./fonts";
import "./globals.css";

const description = `${profile.name}: ${profile.headline} in ${profile.location.city}, ${profile.location.country}. Fine-tuned & quantized LLMs (LoRA/QLoRA, MXFP4, llama.cpp), agentic AI and MCP servers, healthcare AI deployed internationally, computer vision, and full-stack engineering.`;

export const metadata: Metadata = {
  metadataBase: new URL(profile.site),
  title: {
    default: `${profile.name} · ${profile.headline}`,
    template: `%s · ${profile.name}`,
  },
  description,
  applicationName: profile.name,
  authors: [{ name: profile.name, url: profile.site }],
  creator: profile.name,
  keywords: [
    "Avishake Adhikary",
    "Machine Learning Engineer",
    "Agentic AI",
    "LLM fine-tuning",
    "Quantization",
    "MXFP4",
    "llama.cpp",
    "MedGemma",
    "Healthcare AI",
    "Computer Vision",
    "Model Context Protocol",
    "Kolkata",
    "India",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: profile.site,
    siteName: profile.name,
    title: `${profile.name} · ${profile.headline}`,
    description,
    firstName: profile.firstName,
    lastName: profile.lastName,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: `${profile.name} · ${profile.headline}`, description },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0d0a0a",
  colorScheme: "dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: profile.site,
  image: `${profile.site}/opengraph-image.png`,
  jobTitle: profile.headline,
  description,
  email: `mailto:${profile.email}`,
  address: {
    "@type": "PostalAddress",
    addressLocality: profile.location.city,
    addressRegion: profile.location.region,
    addressCountry: profile.location.countryCode,
  },
  worksFor: { "@type": "Organization", name: roles[0].org },
  alumniOf: degrees.map((d) => ({
    "@type": "CollegeOrUniversity",
    name: d.school,
    department: d.institute,
  })),
  knowsLanguage: profile.languages.map((l) => l.name),
  knowsAbout: ["Machine Learning", "Large Language Models", "Agentic AI", "Computer Vision", "Healthcare AI", "Full-stack development"],
  sameAs: Object.values(profile.socials),
  hasCredential: degrees.map((d) => ({
    "@type": "EducationalOccupationalCredential",
    credentialCategory: "degree",
    name: d.degree,
    recognizedBy: { "@type": "CollegeOrUniversity", name: d.school },
  })),
  workExample: publications.map((p) => ({
    "@type": "ScholarlyArticle",
    name: p.title,
    datePublished: p.date,
    url: p.url,
    publisher: p.publisher,
  })),
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${hud.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Applies visitor settings + boot/animation state before first paint (no flash). */}
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_SCRIPT }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <script
          type="application/ld+json"
          // Static, build-time JSON; no user input.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
        />
        <Boot />
        <SiteHeader />
        <ViewTransition default="route">
          <main id="main" className="min-h-[70dvh]">
            {children}
          </main>
        </ViewTransition>
        <SiteFooter />
        <SiteTicker />
        <TerminalDock />
        <Hud />
        <CrashController email={profile.email} />
        <Delights email={profile.email} />
        <Effects />
        <Sound />
        <Keybinds />
        <Toasts />
        <div className="crt-layer" aria-hidden />
      </body>
    </html>
  );
}
