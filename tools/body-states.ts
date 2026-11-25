// Body-state sheet: one picture per body action (breathy, flow, pressed, twang, larynx low/high, soft palate
// lifted/open), each changing one control from Neutral, laid side by side with what to do and what to look at.
// For a singer learning which inside state a cue ("a sigh", "nyah", "start of a yawn") makes.
//
//   bunx vite --host 127.0.0.1 --port 5317   # in another shell
//   bun tools/body-states.ts [out-dir] [url]
//
// Writes <out-dir>/body-states.png and the crops it is built from. Labels are Korean (the sheet's reader).
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright-core";

const out = resolve(process.argv[2] ?? "out/body-states");
const url = process.argv[3] ?? "http://127.0.0.1:5317/";
mkdirSync(out, { recursive: true });

type Shot = { name: string; source?: Record<string, number>; artic?: Record<string, number>; clips: ("head" | "folds" | "tube")[] };
const SHOTS: Shot[] = [
  { name: "breathy", source: { pressure: 6, breathiness: 0.6, tension: 0.2 }, clips: ["folds"] },
  { name: "flow", clips: ["folds", "tube"] },
  { name: "pressed", source: { pressure: 12, breathiness: 0.02, tension: 0.85 }, clips: ["folds"] },
  { name: "twang", artic: { epilarynx: 1 }, clips: ["tube"] },
  { name: "larynx-low", artic: { larynx: -1.5 }, clips: ["head"] },
  { name: "larynx-high", artic: { larynx: 1.5 }, clips: ["head"] },
  { name: "velum-lift", artic: { velum: -1.25 }, clips: ["head"] },
  { name: "velum-open", artic: { velum: 1.0 }, clips: ["head"] },
];
// at a 1600x1000 viewport, Play mode
const CLIP = {
  head: { x: 150, y: 380, width: 570, height: 605 },
  folds: { x: 1209, y: 130, width: 375, height: 216 },
  tube: { x: 809, y: 130, width: 387, height: 216 },
};

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--use-angle=metal", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.getByRole("radio", { name: "Play" }).click();
await page.waitForTimeout(800);
await page.getByRole("button", { name: /^Breathe$/ }).click();
for (const s of SHOTS) {
  await page.getByRole("combobox", { name: "Tone" }).selectOption({ label: "Neutral" });
  await page.evaluate(async ([src, art]) => {
    // the dev server's own module, so this is the store the page uses
    const path = "/src/ui/store.ts";
    const m = (await import(/* @vite-ignore */ path)) as typeof import("../src/ui/store.ts");
    if (src) m.useStore.getState().setSource(src);
    if (art) m.useStore.getState().setArtic(art);
  }, [s.source, s.artic] as const);
  await page.waitForTimeout(2500); // the folds and the tract settle
  for (const c of s.clips) await page.screenshot({ path: `${out}/${s.name}-${c}.png`, clip: CLIP[c] });
}

const cell = (img: string, cap: string) => `<div class="cell"><img src="${img}"><div class="cap">${cap}</div></div>`;
const row = (title: string, note: string, cells: string, cls = "") =>
  `<div class="row ${cls}"><div class="lab"><b>${title}</b><span>${note}</span></div>${cells}</div>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0b0f14;color:#dfe8f0;font-family:"Apple SD Gothic Neo",sans-serif;width:1500px;padding:28px;box-sizing:border-box}
h1{font-size:28px;margin:0 0 6px}.sub{color:#8aa;margin-bottom:22px;font-size:16px}
.row{border-top:1px solid #234;padding:18px 0;display:flex;gap:18px;align-items:flex-start}
.lab{width:230px;flex:none}.lab b{font-size:21px;display:block;margin-bottom:6px}.lab span{color:#9ab;font-size:15px;line-height:1.5}
.cell{flex:1;text-align:center}.cell img{width:100%;border:1px solid #234;border-radius:6px}
.cap{margin-top:8px;font-size:16px;line-height:1.45}.cap em{font-style:normal;color:#ffc76b;font-weight:600}
.crop img{max-height:420px;object-fit:cover;object-position:top}
</style>
<h1>몸속 상태: 무엇을 하면 안에서 무엇이 바뀌나</h1>
<div class="sub">CHIMERA 화면(같은 음 110 Hz, 같은 모음). 한 줄에서 하나만 바꾸었습니다.</div>
${row("① 성대 닫힘", "정면에서 본 성대(왼쪽)와 열린 넓이(오른쪽 위 파형). 파형 사이 평평한 곳 = 성대가 붙어 있는 시간",
  cell("breathy-folds.png", `<em>"하아~"</em> 숨 섞임<br>오래 열려 있고, 닫혀도 틈이 남음`) +
  cell("flow-folds.png", `<em>"음~ → 아"</em> 가운데`) +
  cell("pressed-folds.png", `<em>"앗"</em> 눌림<br>짧게 열리고 오래 붙어 있음`))}
${row("② 트웽", "성대 바로 위의 좁은 관(에피라링크스). 왼쪽 끝 GLOTTIS 쪽을 보세요",
  cell("flow-tube.png", "보통: 성대 위가 넓음") +
  cell("twang-tube.png", `<em>"냐냐냐", 징징대는 "에에"</em><br>성대 바로 위가 깔때기처럼 좁아짐 → 쨍한 소리`))}
${row("③ 후두 높이", "아래쪽 나비 모양(성대)의 높이를 보세요. 울대뼈에 손가락을 대면 느껴집니다",
  cell("larynx-low-head.png", `<em>하품 시작</em>: 후두 내려감<br>관이 길어져 어둡고 굵음`) +
  cell("larynx-high-head.png", `<em>침 삼키기</em>: 후두 올라감<br>관이 짧아져 밝고 얇음`))}
${row("④ 연구개", "입천장 뒤 흰 덮개. 코로 가는 길을 열고 닫습니다",
  cell("velum-lift-head.png", `<em>하품 직전</em>: 들림<br>코 길이 막히고 입 안이 넓음`) +
  cell("velum-open-head.png", `<em>"응(ng)"</em>: 내려감<br>코 길이 열려 콧소리`), "crop")}`;
writeFileSync(`${out}/sheet.html`, html);
const sheet = await browser.newPage({ viewport: { width: 1500, height: 800 }, deviceScaleFactor: 1.5 });
await sheet.goto(`file://${out}/sheet.html`, { waitUntil: "load" });
await sheet.screenshot({ path: `${out}/body-states.png`, fullPage: true });
await browser.close();
console.log(`${out}/body-states.png`);
