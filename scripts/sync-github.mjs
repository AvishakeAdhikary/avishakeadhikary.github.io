#!/usr/bin/env node
/**
 * Pulls live data that the site renders, so nobody has to edit it by hand:
 *
 *   - GitHub: public repos (stars, forks, topics, languages, homepage, dates,
 *     README summary + first image) and pinned repos (GraphQL; needs a token).
 *   - Google Scholar: citation metrics + per-paper citations (best effort;
 *     Scholar frequently CAPTCHAs CI runners).
 *
 * Output: src/content/generated/github.json and scholar.json.
 *
 * Failure policy: never break the build. If a source fails, the previously
 * committed snapshot is kept as-is and a warning is printed.
 *
 * Env: GITHUB_TOKEN (optional; raises rate limits and enables pinned repos).
 */
import fs from "node:fs/promises";
import path from "node:path";

const USER = "AvishakeAdhikary";
const SCHOLAR_ID = "2fegUHYAAAAJ";
const ROOT = path.resolve(import.meta.dirname, "..");
const GEN = path.join(ROOT, "src", "content", "generated");
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

const gh = async (url, accept = "application/vnd.github+json") => {
  const res = await fetch(url.startsWith("http") ? url : `https://api.github.com${url}`, {
    headers: {
      Accept: accept,
      "User-Agent": `${USER}-portfolio-sync`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return accept.includes("raw") ? res.text() : res.json();
};

/** First prose paragraph of a README, stripped of markdown/HTML noise. */
function readmeSummary(md) {
  const lines = md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .split(/\r?\n/);
  const paras = [];
  let cur = [];
  for (const raw of lines) {
    const line = raw.trim();
    const isNoise =
      !line ||
      /^#/.test(line) ||
      /^(\[!\[|!\[|<img|<p|<\/p|<div|<\/div|<a |<br|---|\||>|\* \[|- \[)/i.test(line) ||
      /^\[.*\]\(.*\)$/.test(line) ||
      /^https?:\/\/\S+$/.test(line) ||
      /^(to get started|open http|screenshots|welcome to|this section)/i.test(line);
    if (isNoise) {
      if (cur.length) paras.push(cur.join(" "));
      cur = [];
      continue;
    }
    cur.push(line);
  }
  if (cur.length) paras.push(cur.join(" "));
  const clean = (s) =>
    s
      .replace(/<[^>]+>/g, "")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const first = paras.map(clean).find((p) => p.length > 60) ?? paras.map(clean).find(Boolean) ?? "";
  return first.length > 420 ? `${first.slice(0, 417).replace(/\s+\S*$/, "")}…` : first;
}

/** First image referenced by a README, resolved to an absolute raw URL. */
function readmeImage(md, repo, branch) {
  const m =
    md.match(/!\[[^\]]*\]\(([^)\s]+)/) ?? md.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (!m) return null;
  const src = m[1];
  if (/shields\.io|badge|badgen|img\.shields/i.test(src)) return null;
  if (/^https?:\/\//.test(src)) return src;
  return `https://raw.githubusercontent.com/${USER}/${repo}/${branch}/${src.replace(/^\.?\//, "")}`;
}

async function pinned() {
  if (!TOKEN) return [];
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `{ user(login: "${USER}") { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name } } } } }`,
    }),
  });
  const json = await res.json();
  return json?.data?.user?.pinnedItems?.nodes?.map((n) => n.name) ?? [];
}

async function syncGitHub() {
  const repos = await gh(`/users/${USER}/repos?per_page=100&sort=pushed&type=owner`);
  const pins = await pinned().catch(() => []);
  const out = [];
  for (const r of repos) {
    if (r.fork || r.archived || r.private) continue;
    let summary = "";
    let image = null;
    let languages = {};
    try {
      const md = await gh(`/repos/${USER}/${r.name}/readme`, "application/vnd.github.raw");
      summary = readmeSummary(md);
      image = readmeImage(md, r.name, r.default_branch);
    } catch {
      /* no README */
    }
    try {
      languages = await gh(`/repos/${USER}/${r.name}/languages`);
    } catch {
      /* ignore */
    }
    const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
    out.push({
      name: r.name,
      description: r.description ?? "",
      summary,
      url: r.html_url,
      homepage: r.homepage || null,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      languages: Object.entries(languages)
        .map(([name, bytes]) => ({ name, share: +(bytes / totalBytes).toFixed(3) }))
        .filter((l) => l.share >= 0.02)
        .slice(0, 6),
      topics: r.topics ?? [],
      license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
      createdAt: r.created_at,
      pushedAt: r.pushed_at,
      pinned: pins.includes(r.name),
      readmeImage: image,
      socialImage: `https://opengraph.githubassets.com/1/${USER}/${r.name}`,
    });
  }
  return {
    user: USER,
    syncedAt: new Date().toISOString(),
    totals: {
      repos: out.length,
      stars: out.reduce((a, r) => a + r.stars, 0),
      forks: out.reduce((a, r) => a + r.forks, 0),
    },
    repos: out,
  };
}

async function syncScholar() {
  const url = `https://scholar.google.com/citations?user=${SCHOLAR_ID}&hl=en&pagesize=100`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`Scholar HTTP ${res.status}`);
  const html = await res.text();
  if (!html.includes("gsc_rsb_st")) throw new Error("Scholar returned a CAPTCHA/consent page");
  const cells = [...html.matchAll(/<td class="gsc_rsb_std">(\d+)<\/td>/g)].map((m) => +m[1]);
  const papers = [...html.matchAll(/<tr class="gsc_a_tr">([\s\S]*?)<\/tr>/g)].map(([, row]) => ({
    title: (row.match(/class="gsc_a_at">([^<]+)</)?.[1] ?? "").replace(/&amp;/g, "&").trim(),
    citations: +(row.match(/class="gsc_a_ac gs_ibl">(\d*)</)?.[1] || 0),
    year: +(row.match(/gsc_a_h gsc_a_hc gs_ibl">(\d{4})</)?.[1] || 0) || null,
  }));
  return {
    profile: url.replace("&pagesize=100", ""),
    syncedAt: new Date().toISOString(),
    citations: cells[0] ?? 0,
    hIndex: cells[2] ?? 0,
    i10Index: cells[4] ?? 0,
    papers,
  };
}

async function write(name, data) {
  await fs.mkdir(GEN, { recursive: true });
  await fs.writeFile(path.join(GEN, name), `${JSON.stringify(data, null, 2)}\n`);
}

for (const [name, task] of [
  ["github.json", syncGitHub],
  ["scholar.json", syncScholar],
]) {
  try {
    const data = await task();
    await write(name, data);
    console.log(`sync: wrote ${name}`);
  } catch (err) {
    console.warn(`sync: ${name} skipped, keeping committed snapshot (${err.message})`);
  }
}
