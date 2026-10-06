"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sfx } from "@/components/media/audio/play";
import { music } from "@/components/media/music/controller";
import { GO_TO, keyBlocked } from "@/lib/keybinds";
import { readSettings, updateSettings } from "@/lib/settings";
import { pushToast } from "@/lib/toast";

const KeybindOverlay = dynamic(() => import("./keybind-overlay").then((m) => m.KeybindOverlay), { ssr: false });

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const STYLE_LABEL: Record<string, string> = { lofi: "lo-fi", synthwave: "synthwave", ambient: "ambient", playlist: "CC0 playlist" };
const onOff = (v: boolean) => (v ? "on" : "off");
const info = (title: string) => pushToast({ kind: "info", title });

/** Bump a counter other islands (progress, achievements) can listen to. */
const used = (id: string) => window.dispatchEvent(new CustomEvent("keybind:used", { detail: id }));

/**
 * The site's one keyboard handler (see lib/keybinds.ts for the list and the
 * guard), plus the Konami code, `G` go-to chords, and the click/hold
 * crosshair cursor states.
 */
export function Keybinds() {
  const router = useRouter();
  const [help, setHelp] = useState(false);
  const [helpLoaded, setHelpLoaded] = useState(false);

  useEffect(() => {
    let konami = 0;
    let chord = 0;

    const toggleTheme = (label: string) => {
      const next = readSettings().theme === "phosphor" ? "red" : "phosphor";
      updateSettings({ theme: next });
      info(`${label} · ${next === "phosphor" ? "phosphor green" : "signal red"}`);
    };

    const onKey = (e: KeyboardEvent) => {
      // ⌘K / Ctrl+K works even while typing (like most apps), never over the crash.
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey) && !document.querySelector("[role=alertdialog]")) {
        e.preventDefault();
        window.dispatchEvent(new Event("palette:toggle"));
        used("palette");
        return;
      }
      // ~ also closes the open terminal (but types normally inside inputs).
      if ((e.key === "`" || e.key === "~") && !e.ctrlKey && !e.metaKey && !e.altKey && !document.querySelector("[role=alertdialog]")) {
        const t = e.target as HTMLElement | null;
        if (!t?.isContentEditable && !/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName ?? "")) {
          e.preventDefault();
          window.dispatchEvent(new Event("terminal:toggle"));
          return used("terminal");
        }
      }
      if (e.repeat || keyBlocked(e)) {
        konami = 0;
        return;
      }

      // Konami: tolerant matcher (a third ↑ keeps you at "↑ ↑").
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === KONAMI[konami]) konami++;
      else konami = k === "ArrowUp" ? (konami === 2 ? 2 : 1) : 0;
      if (konami === KONAMI.length) {
        konami = 0;
        e.preventDefault();
        sfx("glitch");
        toggleTheme("jailbreak mode");
        window.dispatchEvent(new Event("konami"));
        return;
      }

      if (chord) {
        clearTimeout(chord);
        chord = 0;
        const dest = GO_TO[k];
        if (dest) {
          e.preventDefault();
          used("go");
          router.push(dest.href);
          return;
        }
      }

      if (e.key === "?") {
        e.preventDefault();
        setHelpLoaded(true);
        setHelp(true);
        return used("help");
      }
      if (e.key === "A" && e.shiftKey) {
        e.preventDefault();
        const room = document.getElementById("trophies");
        if (room) room.scrollIntoView({ behavior: "smooth", block: "start" });
        else router.push("/arcade/#trophies");
        return used("trophies");
      }
      if (e.shiftKey) return;

      const s = readSettings();
      const act: Record<string, () => void> = {
        g: () => {
          chord = window.setTimeout(() => (chord = 0), 1200);
          info("go to… h w p k r a g l x c ,");
        },
        m: () => {
          const on = !music.get().playing;
          void music.toggle();
          info(`music · ${onOff(on)}`);
        },
        n: () => {
          const next = music.next();
          info(`music · ${STYLE_LABEL[next] ?? next}`);
        },
        "[": () => {
          updateSettings({ volume: Math.max(0, s.volume - 10) });
          info(`music volume · ${Math.max(0, s.volume - 10)}%`);
        },
        "]": () => {
          updateSettings({ volume: Math.min(100, s.volume + 10) });
          info(`music volume · ${Math.min(100, s.volume + 10)}%`);
        },
        s: () => {
          updateSettings({ sfx: !s.sfx });
          if (!s.sfx) sfx("toggleOn");
          info(`sound effects · ${onOff(!s.sfx)}`);
        },
        r: () => {
          updateSettings({ hud: !s.hud });
          info(`runtime readout · ${onOff(!s.hud)}${window.matchMedia("(min-width: 1024px)").matches ? "" : " (desktop only)"}`);
        },
        t: () => toggleTheme("theme"),
        c: () => {
          updateSettings({ crt: !s.crt });
          info(`scanlines · ${onOff(!s.crt)}`);
        },
      };
      const run = act[k];
      if (!run) return;
      e.preventDefault();
      run();
      used(k === "g" ? "go" : k);
    };

    // Crosshair press ("recoil") and hold ("charge") states.
    const html = document.documentElement;
    let hold = 0;
    const release = () => {
      clearTimeout(hold);
      html.classList.remove("cursor-press", "cursor-hold");
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      html.classList.add("cursor-press");
      hold = window.setTimeout(() => html.classList.add("cursor-hold"), 350);
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    window.addEventListener("blur", release);
    return () => {
      clearTimeout(chord);
      release();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", release);
    };
  }, [router]);

  return helpLoaded ? <KeybindOverlay open={help} onOpenChange={setHelp} /> : null;
}
