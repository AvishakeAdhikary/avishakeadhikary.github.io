import { expect, test } from "./fixtures";

/**
 * The four Minion Technologies projects are unpublished (`public: false` in
 * src/content/projects.ts): no page, cover, sitemap entry, search entry or
 * link may exist for them. Runs against the build and, after deploy, live.
 */
const PRIVATE = ["zoyemed", "phi-deidentification-pipeline", "agentic-crm-automation", "ptz-face-tracking"];

test.use({ viewport: { width: 1280, height: 860 }, site: { allow404: PRIVATE.map((s) => `/projects/${s}/`) } });

test("their pages and covers are not served", async ({ page }) => {
  for (const slug of PRIVATE) {
    expect((await page.request.get(`/projects/${slug}/`)).status(), `/projects/${slug}/`).toBe(404);
    expect((await page.request.get(`/covers/${slug}.svg`)).status(), `/covers/${slug}.svg`).toBe(404);
  }
  // A visitor who types the old address lands on the site's own 404 page.
  const res = await page.goto(`/projects/${PRIVATE[0]}/`);
  expect(res?.status()).toBe(404);
});

test("the sitemap and the terminal's index don't mention them", async ({ page }) => {
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  const index = await (await page.request.get("/search-index.json")).text();
  expect(sitemap).toContain("/projects/");
  for (const slug of PRIVATE) {
    expect(sitemap, `sitemap: ${slug}`).not.toContain(slug);
    expect(index, `search index: ${slug}`).not.toContain(slug);
  }
});

test("no public page links to them, and the Minion role stays public", async ({ page }) => {
  for (const path of ["/", "/projects/", "/work/", "/skills/"]) {
    await page.goto(path);
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    for (const slug of PRIVATE) expect(hrefs.filter((h) => h.includes(slug)), `${path} → ${slug}`).toEqual([]);
  }
  await page.goto("/projects/");
  await expect(page.getByText("Turning hospital archives into safe training data")).toHaveCount(0);
  await page.goto("/work/");
  const minion = page.locator("#ckpt-minion");
  await expect(minion).toContainText("Machine Learning Engineer");
  await expect(minion).toContainText("Minion Technologies");
  await expect(minion).toContainText("LoRA/QLoRA");
});
