"use strict";
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const { mkdirSync } = require("node:fs");
const makeZip = require("./zip-fixture.js");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const base = process.env.TEST_BASE_URL || "http://127.0.0.1:8011";
    await page.goto(base);
    await page.waitForFunction(() => document.querySelector("#artist-list").children.length > 0);
    assert.match(await page.locator("#mode-pill").innerText(), /ejemplo/);
    const rows = Array.from({ length: 48 }, (_, i) => ({
      ts: new Date(Date.UTC(2025, 0, 1 + Math.floor(i / 4), i % 24)).toISOString(),
      ms_played: i === 0 ? 15000 : 180000,
      master_metadata_track_name: `Tema ${i % 12}`,
      master_metadata_album_artist_name: `Artista ${i % 6}`,
      master_metadata_album_album_name: "Disco de prueba",
      spotify_track_uri: `spotify:track:test${i % 12}`,
      skipped: i % 5 === 0, shuffle: i % 2 === 0, offline: false, platform: "desktop"
    }));
    const zip = makeZip({
      "Streaming_History_Audio_2025_0.json": JSON.stringify(rows),
      "Streaming_History_Audio_2025_1.json": JSON.stringify(rows),
      "Userdata.json": JSON.stringify({ private: "ignored" })
    });
    await page.locator("#history-remember").check();
    await page.locator("#history-files").setInputFiles({ name: "spotify-test.zip", mimeType: "application/zip", buffer: zip });
    await page.waitForFunction(() => document.querySelector("#history-status").textContent.includes("48 duplicados"));
    assert.equal(await page.locator("#history-play-count").innerText(), "47");
    assert.equal(await page.locator("#history-ranking tr").count(), 12);
    assert.equal(await page.locator("#history-habits article").count(), 10);
    assert.equal(await page.locator("#history-heatmap i").count(), 7 * 24);
    assert.match(await page.locator("#story-years").innerText(), /2025/);
    assert.match(await page.locator("#history-status").innerText(), /Guardado/);
    await page.locator("#history-search").fill("Tema 11");
    await page.waitForFunction(() => document.querySelectorAll("#history-ranking tr").length === 1);
    assert.match(await page.locator("#history-ranking").innerText(), /Tema 11/);
    await page.locator("#history-search").fill("");
    await page.locator("#history-sort").selectOption("time");
    await page.reload();
    await page.waitForFunction(() => document.querySelector("#history-status").textContent.includes("restaurados"));
    assert.equal(await page.locator("#history-play-count").innerText(), "47");
    mkdirSync("artifacts", { recursive: true });
    await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
    await page.locator(".hero-grid").screenshot({ path: "artifacts/mobile-hero.png" });
    await page.locator("#history-habits").screenshot({ path: "artifacts/mobile-habits.png" });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no horizontal overflow");
    assert.equal(await page.locator("#mode-pill").isVisible(), true, "demo label remains visible on mobile");
    await page.locator("#history-clear").click();
    await page.waitForFunction(() => document.querySelector("#history-results").hidden);
    await page.reload();
    await page.waitForFunction(() => document.querySelector("#artist-list").children.length > 0);
    assert.equal(await page.locator("#history-results").isVisible(), false);

    // Authenticated account with upstream failure must never label demo as real.
    await page.route("**/api/auth/status", (route) => route.fulfill({ json: { authenticated: true, configured: true, profile: { displayName: "Test listener" } } }));
    await page.route("**/api/insights?*", (route) => route.fulfill({ status: 502, json: { detail: "test failure" } }));
    await page.reload();
    await page.locator("#data-notice").waitFor({ state: "visible" });
    assert.match(await page.locator("#mode-pill").innerText(), /ejemplo/);
    assert.equal(await page.locator("#share-button").isDisabled(), true);
    assert.match(await page.locator("#user-profile-name").innerText(), /Test listener/);
    const payload = await page.evaluate(() => ({
      ...demoData.short_term,
      range: "short_term", profile: "rock experimental de nombre muy largo × pop", genreCoveredArtists: 1,
      genres: [{ name: "rock experimental de nombre muy largo", weight: 100, artistCount: 1, artistShare: 5, artists: ["Test artist"] }],
      dataScience: { sampleSize: 0 },
      genreFamilies: [{ name: "Rock", share: 100, weightedScore: 1, artistCount: 1, examples: ["Test artist"] }],
      tasteShift: { distance: 40, rising: [{ name: "Rock", delta: 12 }], falling: [] },
      rankStability: 61, bridges: [],
      artists: [], tracks: [],
      comparison: { label: "Últimos 6 meses", sampleSize: 0, sharedCount: 0, enteredCount: 0, exitedCount: 0, entered: [] }
    }));
    await page.unroute("**/api/insights?*");
    await page.route("**/api/insights?*", (route) => route.fulfill({ json: payload }));
    await page.locator("#data-retry").click();
    await page.waitForFunction(() => document.querySelector("#mode-pill").textContent.includes("Datos reales"));
    assert.equal(await page.locator("#data-notice").isVisible(), false);
    assert.match(await page.locator("#comparison-title").innerText(), /Top 0/);
    assert.equal(await page.locator("#evo-shift").innerText(), "40%");
    assert.equal(await page.locator("#evo-artist-stability").innerText(), "61%");
    assert.match(await page.locator("#family-moves").innerText(), /Rock/);
    const labelsFit = await page.locator(".genre-node:not([hidden]) span").evaluateAll((labels) => labels.every((label) => label.scrollHeight <= label.parentElement.clientHeight));
    assert.equal(labelsFit, true, "genre labels stay inside circles");
    await page.unroute("**/api/insights?*");
    await page.route("**/api/insights?*", (route) => route.fulfill({ status: 502, json: {} }));
    await page.locator('[data-range="medium_term"]').click();
    await page.locator("#data-notice").waitFor({ state: "visible" });
    assert.equal(await page.locator('[data-range="short_term"]').getAttribute("class"), "range-button active");
    assert.match(await page.locator("#data-notice-copy").innerText(), /Ahora/);
    // Simulate browsers that deny IndexedDB inside the worker. In-memory import
    // and removal must remain usable without claiming persistent deletion.
    await page.route("**/history-worker.js", async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      await route.fulfill({ response, body: source.replace('const request = indexedDB.open("frecuencia-history", 1);', 'throw new Error("Storage blocked for test");') });
    });
    await page.reload();
    await page.locator("#history-files").setInputFiles({ name: "spotify-test.zip", mimeType: "application/zip", buffer: zip });
    await page.waitForFunction(() => document.querySelector("#history-status").textContent.includes("no permitió"));
    await page.locator("#history-clear").click();
    await page.waitForFunction(() => document.querySelector("#history-results").hidden);
    assert.match(await page.locator("#history-status").innerText(), /no pudimos comprobar/);
    assert.deepEqual(errors, []);
    console.log("Browser: ZIP → worker → ranking → search → persistence → deletion; mobile; API errors and period recovery: PASS");
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
