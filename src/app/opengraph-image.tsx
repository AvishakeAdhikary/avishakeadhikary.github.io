import { ImageResponse } from "next/og";
import { profile } from "@/content/profile";
import { stats } from "@/lib/stats";

export const dynamic = "force-static";
export const alt = `${profile.name}, ${profile.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const line = (prefix: string, text: string, color: string) => (
  <div style={{ display: "flex", gap: 16 }}>
    <span style={{ color: "#ef4444" }}>{prefix}</span>
    <span style={{ color }}>{text}</span>
  </div>
);

/** Build-time social card in the site's terminal style. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: 64,
          background: "radial-gradient(900px 520px at 85% -10%, rgba(239,68,68,0.35), transparent 60%), #120b0b",
          color: "#f5f0f0",
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", gap: 10, marginBottom: 36 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ef4444" }} />
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#3a2a2a" }} />
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#3a2a2a" }} />
          <div style={{ display: "flex", marginLeft: 16, fontSize: 22, color: "#8f7d7d" }}>guest@avishake:~</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 30 }}>{line(">", "who is avishake adhikary?", "#cfc4c4")}</div>
        <div style={{ display: "flex", marginTop: 34, fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
          {profile.name}
          <span style={{ color: "#ef4444" }}>.</span>
        </div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 38, color: "#fca5a5" }}>{profile.headline} · Kolkata, India</div>
        <div style={{ display: "flex", marginTop: "auto", gap: 36, fontSize: 25, color: "#b8aaaa" }}>
          <span>healthcare AI</span>
          <span>LLM fine-tuning</span>
          <span>{stats.publications} publications</span>
          <span>{stats.githubStars} GitHub stars</span>
        </div>
      </div>
    ),
    size,
  );
}
