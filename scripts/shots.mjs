import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE || "http://localhost:3100";
const OUT = process.env.OUT || "docs/shots";
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-webgl"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 960 }, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => { if (m.type() === "error") logs.push(m.text()); });
page.on("pageerror", (e) => logs.push("PAGEERROR " + e.message));
const shot = async (n) => { await page.screenshot({ path: `${OUT}/${n}.png` }); console.log("shot", n); };
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForSelector("canvas", { timeout: 60000 });
await page.waitForTimeout(9000);
await shot("01-overview");
await page.getByRole("button", { name: /Simulate CVE drop/ }).first().click();
await page.waitForTimeout(1200);
await shot("02-cve-drop");
await page.waitForSelector("text=Brief filed", { timeout: 60000 });
await page.waitForTimeout(2500);
await shot("03-agents-brief");
await page.waitForTimeout(7000);
await shot("04-flythrough");
// open cypher on Tracer
await page.locator("button:has-text('Cypher')").nth(1).click();
await page.waitForTimeout(600);
await shot("05-explain-cypher");
// click claim about payments-api
const claim = page.locator("button:has-text('payments-api (tier 1')").first();
if (await claim.count()) { await claim.click(); await page.waitForTimeout(5500); await shot("06-claim-path"); }
await page.getByRole("button", { name: /Who holds the keys/ }).click();
await page.waitForTimeout(6000);
await shot("07-key-holders");
await page.getByRole("button", { name: /^Memory$/ }).first().click();
await page.waitForTimeout(1200);
await shot("08-memory");
await page.locator("aside button:has-text('findings')").last().click();
await page.waitForTimeout(3500);
await shot("09-memory-recall");
console.log("console errors:", logs.slice(0, 8));
await browser.close();
