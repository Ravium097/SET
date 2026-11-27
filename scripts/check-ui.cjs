const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4178",
    "--strictPort",
  ],
  { stdio: "ignore" },
);
const origin = "http://127.0.0.1:4178";
(async () => {
  let up = false;
  for (let n = 0; n < 50; n++) {
    try {
      if ((await fetch(origin)).ok) {
        up = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(up, "Preview failed");
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    for (const viewport of [
      { width: 320, height: 740 },
      { width: 375, height: 667 },
      { width: 393, height: 852 },
      { width: 430, height: 932 },
      { width: 820, height: 1180 },
      { width: 1180, height: 820 },
    ]) {
      const page = await browser.newPage({ viewport });
      for (const route of [
        "/",
        "/training",
        "/library",
        "/history",
        "/stats",
        "/settings",
        "/import",
      ]) {
        await page.goto(origin + route);
        await page.locator(".app-dock nav").waitFor();
        await page.evaluate(() => document.fonts.ready);
        const bounds = await page
          .locator("main")
          .evaluate((e) => ({ width: e.clientWidth, scroll: e.scrollWidth }));
        assert(
          bounds.scroll <= bounds.width,
          `Overflow ${route} ${viewport.width}`,
        );
        const before = await page.locator(".app-dock nav").boundingBox();
        await page
          .locator("main")
          .evaluate((e) => (e.scrollTop = e.scrollHeight));
        const after = await page.locator(".app-dock nav").boundingBox();
        assert(Math.abs(before.y - after.y) < 1, "Dock moved");
      }
      await page.close();
      console.log("Layout PASS", viewport.width, viewport.height);
    }
    const page = await browser.newPage({
      viewport: { width: 393, height: 852 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.goto(origin + "/training");
    await page.getByRole("button", { name: "Vorlage erstellen" }).click();
    await page.getByLabel("Name", { exact: true }).fill("QA Template");
    await page
      .getByLabel("Übung auswählen")
      .selectOption({ label: "Bankdrücken" });
    await page.getByLabel("Gewicht", { exact: true }).fill("22,5");
    await page.getByLabel("Wiederholungen", { exact: true }).fill("8");
    await page.getByLabel("Wiederholungen", { exact: true }).blur();
    await page.waitForTimeout(200);
    await page.reload();
    assert.equal(
      await page.getByLabel("Gewicht", { exact: true }).inputValue(),
      "22.5",
    );
    await page.getByRole("link", { name: "Training", exact: true }).click();
    await page.getByRole("button", { name: "QA Template starten", exact: true }).click();
    await page.getByRole("heading", { name: "Im Training" }).waitFor();
    for (const width of [320, 393, 820]) {
      await page.setViewportSize({width,height:852});
      const alignment = await page.locator('.workout-fields').evaluate(root=>{
        const header=root.querySelector('.setheading'), row=root.querySelector('.set');
        const heads=[...header.children].map(e=>e.getBoundingClientRect());
        const fields=[...row.children].map(e=>e.getBoundingClientRect());
        return heads.every((h,i)=>Math.abs((h.left+h.width/2)-(fields[i].left+fields[i].width/2))<1) && row.getBoundingClientRect().right<=document.querySelector('main').getBoundingClientRect().right-15;
      });
      assert(alignment, `Set grid alignment at ${width}`);
    }
    await page.setViewportSize({width:393,height:852});
    await page.locator('.set').first().scrollIntoViewIfNeeded();

    await page.getByRole('button',{name:'Fokusmodus',exact:true}).click();
    for(const width of [320,393,820]) {
      await page.setViewportSize({width,height:852});
      const fields=await page.locator('.set[data-current="true"] .numeric input').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {width:r.width,left:r.left,right:r.right}}));
      assert.equal(fields.length,2);
      assert(fields[0].width>=90 && Math.abs(fields[0].width-fields[1].width)<1 && fields[0].right<fields[1].left,JSON.stringify(fields));
      assert(await page.getByRole('button',{name:'Satz abschließen ✓',exact:true}).isVisible());
    }
    await page.setViewportSize({width:393,height:852});
    if(process.env.REVIEW_SCREENSHOT) await page.screenshot({path:process.env.REVIEW_SCREENSHOT});
    await page.getByRole('button',{name:'← Normale Ansicht',exact:true}).click();
    await page.getByRole("button", { name: "Gewicht erhöhen" }).click();
    await page.waitForTimeout(100);
    assert.equal(
      await page.getByLabel("Gewicht", { exact: true }).inputValue(),
      "25",
    );
    await page.getByLabel("Satz abgeschlossen").click();
    await page.locator(".timer").waitFor();
    const main = await page.locator("main").boundingBox(),
      dock = await page.locator(".app-dock").boundingBox();
    assert(main.y + main.height <= dock.y + 1, "Timer overlap");
    await page.reload();
    assert.equal(
      await page.getByLabel("Gewicht", { exact: true }).inputValue(),
      "25",
    );
    assert(await page.getByLabel("Satz abgeschlossen").isChecked());
    await page.getByRole("button", { name: "Training abschließen" }).click();
    await page.waitForURL("**/history");
    await page.getByRole("link", { name: /QA Template/ }).waitFor();
    await page.goto(origin + "/progress/muscles");
    await page.getByLabel('Muskelgruppen Vorderseite',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Hinten',exact:true}).click();
    await page.getByLabel('Muskelgruppen Rückseite',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Vorne',exact:true}).click();

    await page.goto(origin + "/stats");
    await page.getByText("Trainingsvolumen", { exact: true }).waitFor();
    await page.goto(origin + "/settings");
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "JSON-Backup exportieren" }).click();
    const download = await downloading;
    const backup = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
    const template = backup.workouts.find((w) => w.status === "template");
    const finished = backup.workouts.find((w) => w.status === "completed");
    assert.equal(template.exercises[0].sets[0].weight, 22.5);
    assert.equal(finished.exercises[0].sets[0].weight, 25);
    assert.equal(finished.exercises[0].sets[0].reps, 8);
    await page.getByRole("button", { name: "Alle Daten löschen" }).click();
    await page.waitForTimeout(150);
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "qa-backup.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(backup)),
      });
    await page.waitForTimeout(200);
    await page.goto(origin + "/history");
    await page.getByRole("link", { name: /QA Template/ }).waitFor();
    await page.goto(origin + "/training");
    assert.equal(await page.getByText("Drück- und Zugtraining", {exact:true}).count(), 0);
    await page.goto(origin + "/nutrition");
    await page.waitForURL(origin + "/");
    assert.equal(await page.locator('.app-dock nav a').count(), 3);
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "Flow PASS: template independence; comma input; plus; set completion; timer; reload; history; charts; backup export and restore (isolated profile).",
    );
  } finally {
    await browser.close();
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.kill());
