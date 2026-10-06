// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { keyBlocked } from "@/lib/keybinds";

const key = (target: EventTarget, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent("keydown", { key: "t", bubbles: true, cancelable: true, ...init });
  Object.defineProperty(e, "target", { value: target });
  return e;
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("keyBlocked", () => {
  it("lets shortcuts through on the page itself", () => {
    expect(keyBlocked(key(document.body))).toBe(false);
  });

  it("blocks while typing in inputs, textareas, selects and editable content", () => {
    document.body.innerHTML = `<input id="i"><textarea id="t"></textarea><select id="s"></select><div id="c" contenteditable="true"></div>`;
    for (const id of ["i", "t", "s"]) expect(keyBlocked(key(document.getElementById(id)!)), id).toBe(true);
    const c = document.getElementById("c")!;
    Object.defineProperty(c, "isContentEditable", { value: true });
    expect(keyBlocked(key(c))).toBe(true);
  });

  it("blocks unrelated modifiers unless asked to allow them", () => {
    expect(keyBlocked(key(document.body, { ctrlKey: true }))).toBe(true);
    expect(keyBlocked(key(document.body, { ctrlKey: true }), { modifiers: true })).toBe(false);
  });

  it("blocks over the crash screen, open dialogs and the open terminal", () => {
    for (const html of [`<div role="alertdialog"></div>`, `<div role="dialog" data-state="open"></div>`, `<div aria-modal="true"></div>`, `<div id="dropdown-terminal"></div>`]) {
      document.body.innerHTML = html;
      expect(keyBlocked(key(document.body)), html).toBe(true);
    }
    document.body.innerHTML = `<div id="dropdown-terminal" inert></div>`;
    expect(keyBlocked(key(document.body))).toBe(false);
  });

  it("blocks keys aimed at a keyboard-focused control, but not arrows", () => {
    document.body.innerHTML = `<button id="b">x</button>`;
    const b = document.getElementById("b")!;
    vi.spyOn(b, "matches").mockImplementation((sel: string) => sel === ":focus-visible");
    expect(keyBlocked(key(b))).toBe(true);
    expect(keyBlocked(key(b, { key: "ArrowUp" }))).toBe(false);
  });

  it("ignores events already handled", () => {
    const e = key(document.body);
    e.preventDefault();
    expect(keyBlocked(e)).toBe(true);
  });
});

describe("settings", () => {
  const load = async (stored?: object) => {
    vi.resetModules();
    localStorage.clear();
    if (stored) localStorage.setItem("avishake-settings", JSON.stringify(stored));
    return import("@/lib/settings");
  };

  it("defaults to full motion, music on and sound effects on", async () => {
    const s = (await load()).readSettings();
    expect(s.motion).toBe("full");
    expect(s.musicOn).toBe(true);
    expect(s.sfx).toBe(true);
  });

  it("migrates the old 'auto' motion value (shown as Full) to full", async () => {
    expect((await load({ motion: "auto" })).readSettings().motion).toBe("full");
  });

  it("reduces motion only for Reduced, or System when the OS asks", async () => {
    const os = (reduce: boolean) =>
      vi.spyOn(window, "matchMedia").mockImplementation((q: string) => ({ matches: reduce && q.includes("reduce"), media: q }) as MediaQueryList);
    for (const [motion, reduce, expected] of [
      ["full", true, false],
      ["system", true, true],
      ["system", false, false],
      ["reduced", false, true],
    ] as const) {
      const m = await load({ motion });
      os(reduce);
      expect(m.motionReduced(), `${motion} / OS reduce ${reduce}`).toBe(expected);
    }
  });
});
