// Builds deck.pptx (editable) and deck.html from one slide spec, then prints
// deck.pdf and per-slide PNGs with headless Chrome or Edge.
// Usage (from the deck folder):  npm install   then   node build_deck.js
// Geometry is in inches on a 13.333 x 7.5 in (16:9) slide; text sizes in points.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const OUT = __dirname;
const RENDER = path.join(OUT, "render");

// ---------- shared project constants (config.js at the repo root) ----------
const cfgText = fs.readFileSync(path.join(ROOT, "config.js"), "utf8");
const CFG = JSON.parse(cfgText.slice(cfgText.indexOf("=", cfgText.indexOf("PROJECT_CONFIG")) + 1).trim().replace(/;\s*$/, ""));
const NAME = CFG.projectName;
// Name split for the two-color logotype: the "ROV" part in the accent color.
const NAME_RUNS = () => /ROV$/.test(NAME) ? [[NAME.slice(0, -3), {}], ["ROV", { c: "22D3EE" }]] : [[NAME, {}]];

// ---------- palette and type ----------
const K = {
  bg: "06101D", card: "0B2036", card2: "0F2943", line: "1A3A5A",
  cyan: "22D3EE", teal: "2DD4A8", blue: "1E82FF", amber: "F5A623",
  text: "EEF4FF", muted: "8FA3BF",
};
const FONT = "Calibri";
const W = 13.333, H = 7.5, MX = 0.75, CW = W - 2 * MX;

// ---------- icons (24x24 stroke icons drawn for this deck) ----------
const ICONS = {
  scan: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.5 5.5"/>',
  map: '<path d="M3 6.5 9 3.5l6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>',
  flag: '<path d="M5 21V3.5"/><path d="M5 4h12l-2.5 4.5L17 13H5"/>',
  sample: '<path d="M8 3h8"/><path d="M9.5 3v14a2.5 2.5 0 0 0 5 0V3"/><path d="M9.5 12h5"/>',
  lab: '<path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.8A1.5 1.5 0 0 0 5.9 21h12.2a1.5 1.5 0 0 0 1.3-2.2L14 9.5V3"/><path d="M7.2 15h9.6"/>',
  person: '<circle cx="12" cy="7.5" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  fish: '<path d="M2.5 12c3-5 9.5-6 13.5-2l5-3v10l-5-3c-4 4-10.5 3-13.5-2z"/><circle cx="7.5" cy="11.2" r=".9"/>',
  service: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="m9 13 2 2 4-4"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 9.5 4.3 4.3 0 0 0 7 18z"/>',
  cube: '<path d="m12 2.5 8.5 4.8v9.4L12 21.5l-8.5-4.8V7.3z"/><path d="M12 21.5V12M3.5 7.3 12 12l8.5-4.7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  chart: '<path d="M3 20h18"/><path d="M6.5 16v-4M11.5 16V7M16.5 16v-6"/>',
  group: '<circle cx="9" cy="8" r="3.4"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><circle cx="17" cy="9" r="2.7"/><path d="M17 14c2.8 0 4.8 2.2 4.8 5"/>',
  rov: '<rect x="4.5" y="8" width="15" height="8" rx="4"/><circle cx="15.5" cy="12" r="1.7"/><path d="M1.5 10v4M22.5 10v4M4.5 12h-3M19.5 12h3M9 8V6h4v2"/>',
  wave: '<path d="M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M2 10c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/>',
  coast: '<path d="M2 18c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0"/><path d="M3 13.5 8 7l4 4.5 3-3 6 5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
};
function iconSvg(name, color, px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="#${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="PX" height="PX"><circle cx="20" cy="20" r="18" fill="none" stroke="#22D3EE" stroke-width="2.5"/><path d="M7 23c4-4 8-4 13 0s9 4 13 0" fill="none" stroke="#2DD4A8" stroke-width="2.5" stroke-linecap="round"/><circle cx="20" cy="14" r="3" fill="#22D3EE"/></svg>`;
const ROV_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160" width="PX" height="PX" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14c34 0 52 8 66 34" stroke="#8FA3BF" stroke-width="3"/><rect x="66" y="40" width="108" height="20" rx="10" fill="#0F2943" stroke="#22D3EE" stroke-width="3.5"/><rect x="58" y="56" width="124" height="54" rx="16" fill="#12355A" stroke="#22D3EE" stroke-width="4"/><circle cx="160" cy="83" r="14" fill="#06101D" stroke="#22D3EE" stroke-width="4"/><circle cx="160" cy="83" r="5.5" fill="#22D3EE"/><rect x="22" y="68" width="34" height="30" rx="9" fill="#0F2943" stroke="#2DD4A8" stroke-width="4"/><rect x="184" y="68" width="34" height="30" rx="9" fill="#0F2943" stroke="#2DD4A8" stroke-width="4"/><path d="M30 76v14M48 76v14M192 76v14M210 76v14" stroke="#2DD4A8" stroke-width="3"/><rect x="78" y="110" width="16" height="22" rx="5" fill="#2DD4A8"/><rect x="104" y="110" width="16" height="26" rx="5" fill="#22D3EE"/><rect x="130" y="110" width="16" height="22" rx="5" fill="#1E82FF"/><path d="M84 72h52M84 86h40" stroke="#8FA3BF" stroke-width="3" stroke-opacity=".6"/></svg>`;

function avatarSvg(kind) {
  const hair = "#0A1A2C", skin = "#E9F0F8", shade = "#C9D6E6";
  const back = kind === "f"
    ? `<path d="M29.5 46C29.5 26 38.5 17.5 50 17.5S70.5 26 70.5 46c0 9 1.6 15.5 4 20.5-6.5 3.5-15 4.5-24.5 4.5s-18-1-24.5-4.5c2.4-5 4-11.5 4-20.5z" fill="${hair}"/>`
    : "";
  const top = kind === "f"
    ? `<path d="M34 43c0-12.5 6.8-19.5 16.5-19.5 9 0 15.5 6.5 15.5 18-3.5-5.8-9.5-9-17-9.5-6 2.5-11 6.2-15 11z" fill="${hair}"/>`
    : `<path d="M33.6 41.5C33 28 40.5 20.5 50.5 20.5c9.6 0 16.6 6.8 16 20.5-2.6-5.2-6.6-8.6-11.6-9.6-6.2 2.6-13.6 3.6-21.3 10.1z" fill="${hair}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="PX" height="PX"><defs><clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2DD4A8"/><stop offset="1" stop-color="#1FB894"/></linearGradient></defs><g clip-path="url(#c)"><rect width="100" height="100" fill="#163E66"/>${back}<path d="M12 104c0-19 15.5-33 38-33s38 14 38 33z" fill="url(#g)"/><path d="M41 71.5 50 82l9-10.5c-2.7-.6-5.7-.9-9-.9s-6.3.3-9 .9z" fill="${shade}"/><rect x="43.5" y="56" width="13" height="17" rx="5" fill="${shade}"/><ellipse cx="50" cy="44" rx="15.5" ry="17.5" fill="${skin}"/>${top}</g><circle cx="50" cy="50" r="48.5" fill="none" stroke="#22D3EE" stroke-opacity=".55" stroke-width="2"/></svg>`;
}

// ---------- element builders ----------
// runs: string or [[text, {c, b}], ...]; "\n" inside text breaks the line.
const T = (x, y, w, h, runs, o = {}) => ({ k: "text", x, y, w, h, runs: typeof runs === "string" ? [[runs, {}]] : runs, o });
const R = (x, y, w, h, o = {}) => ({ k: "rect", x, y, w, h, o });
const E = (x, y, w, h, o = {}) => ({ k: "ellipse", x, y, w, h, o });
const I = (x, y, s, name, color) => ({ k: "svg", x, y, w: s, h: s, svg: iconSvg(name, color, 512), key: name + color, alt: name + " icon" });
const S = (x, y, w, h, svg, key) => ({ k: "svg", x, y, w, h, svg, key, alt: key.replace("-f", " (female)").replace("-m", " (male)") });
const IMG = (x, y, w, h, file, alt) => ({ k: "img", x, y, w, h, file, alt });
const LN = (x1, y1, x2, y2, o = {}) => ({ k: "line", x1, y1, x2, y2, o });
const TRI = (cx, cy, s, rot, color) => ({ k: "tri", x: cx - s / 2, y: cy - s / 2, w: s, h: s, rot, color });

function eyebrow(t) { return T(MX, 0.55, CW, 0.4, t, { size: 18, b: true, c: K.cyan, spacing: 3 }); }
function headline(runs, h = 1.0) { return T(MX, 0.95, CW, h, runs, { size: 54, b: true }); }
function chrome(n, total) {
  const els = [T(MX, 6.92, 3, 0.36, NAME, { size: 18, b: true, c: K.muted })];
  const d = 0.11, g = 0.15, tw = total * d + (total - 1) * g, x0 = (W - tw) / 2;
  for (let i = 0; i < total; i++) els.push(E(x0 + i * (d + g), 7.05, d, d, { fill: i === n - 1 ? K.cyan : K.line }));
  return els;
}
function iconDisc(x, y, d, name, color, fill = K.card2) {
  return [E(x, y, d, d, { fill }), I(x + d * 0.22, y + d * 0.22, d * 0.56, name, color)];
}

// ---------- slides ----------
const TOTAL = 10;
const slides = [];

// 1. Title
slides.push({
  els: [
    S(W / 2 - 0.55, 1.0, 1.1, 1.1, LOGO, "logo"),
    T(MX, 2.3, CW, 1.6, NAME_RUNS(), { size: 100, b: true, align: "center" }),
    T(MX, 3.95, CW, 0.55, CFG.expansion, { size: 32, c: K.muted, align: "center" }),
    T(MX, 4.6, CW, 0.6, CFG.tagline, { size: 32, align: "center" }),
    T(MX, 5.55, CW, 0.85, "Lakes. Seas. Oceans.", { size: 48, b: true, c: K.cyan, align: "center" }),
  ],
  notes: `[0:00 to 0:15, moving to slide 2]\nSeventy-eight percent of Europe's inland bathing waters, its lakes and rivers, are rated "excellent" for swimming. That rating comes from just two bacteria tests, taken from the shore, a few times a season.`,
});

// 2. Problem
(() => {
  const cx = 6.3, cw = W - MX - cx;
  const card = (y, icon, title, body) => [
    R(cx, y, cw, 1.95, { fill: K.card, r: 0.18 }),
    ...iconDisc(cx + 0.3, y + 0.22, 0.7, icon, K.cyan),
    T(cx + 1.2, y + 0.3, cw - 1.5, 0.55, title, { size: 30, b: true }),
    T(cx + 0.25, y + 1.0, cw - 0.5, 0.9, body, { size: 28, c: K.text }),
  ];
  slides.push({
    els: [
      eyebrow("THE PROBLEM"),
      headline([["Dangerous water looks ", {}], ["safe.", { c: K.cyan }]]),
      T(MX, 1.75, 5.5, 1.95, "78%", { size: 120, b: true, c: K.cyan }),
      T(MX, 3.72, 5.4, 1.45, "of Europe's inland bathing waters are rated \"excellent\" from just 2 bacteria tests.", { size: 28 }),
      T(MX, 5.2, 5.4, 0.95, "88% on the coast. Source: EEA, 2025.\nStandards: WHO, EU Directive 2008/105/EC, EU shellfish biotoxin limits, Romanian Order 161/2006.", { size: 18, c: K.muted }),
      ...card(2.05, "person", "People", "Toxins hit nerves and liver.\nMetals harm kidneys. Cancer risk."),
      ...card(4.2, "fish", "Nature", "Blooms and low oxygen kill fish.\nPollution builds up in food chains."),
      T(MX, 6.35, CW, 0.5, "The gap: no precise data on risks to people and nature.", { size: 30, b: true, align: "center" }),
      ...chrome(2, TOTAL),
    ],
    notes: `[0:15 to 0:35]\nWhat harms people and nature isn't on that test: toxins that attack the nervous system and the liver, metals like mercury and arsenic, fuel and pesticides. In the sea, toxins reach us through shellfish. Between samples, nobody is watching. The real gap is precise data on the risks to people and nature.`,
  });
})();

// 3. Solution
(() => {
  const steps = [["scan", "Scan", K.cyan], ["map", "Map", K.cyan], ["flag", "Flag", K.amber], ["sample", "Sample", K.cyan], ["lab", "Lab confirms", K.cyan]];
  const colW = 2.15, gap = (CW - 5 * colW) / 4, d = 1.15, cy = 2.95;
  const els = [
    eyebrow("THE SOLUTION · FROM LAKES TO OCEANS"),
    headline([["A robot that finds the risk.\nAnd ", {}], ["where to sample.", { c: K.cyan }]], 1.85),
  ];
  steps.forEach(([ic, label, col], i) => {
    const x = MX + i * (colW + gap), ccx = x + colW / 2;
    els.push(...iconDisc(ccx - d / 2, cy, d, ic, col));
    els.push(T(x - 0.1, cy + d + 0.12, colW + 0.2, 0.5, label, { size: 28, b: true, align: "center" }));
    if (i < 4) els.push(LN(ccx + d / 2 + 0.12, cy + d / 2, ccx + colW + gap - d / 2 - 0.12, cy + d / 2, { c: K.muted, w: 2, arrow: true }));
  });
  const sy = 4.95, sh = 1.05;
  els.push(R(MX, sy, CW, sh, { fill: K.card, r: 0.18 }));
  els.push(T(MX + 0.35, sy + 0.06, 4.2, sh - 0.12, [["One modular robot.\n", { b: true }], ["Plug-in sensors:", { c: K.muted }]], { size: 28, valign: "middle" }));
  const chips = ["Physical", "Chemical", "Biological"], chW = 2.2, chG = 0.25, chX0 = MX + CW - 0.3 - (3 * chW + 2 * chG);
  chips.forEach((t, i) => {
    const x = chX0 + i * (chW + chG);
    els.push(R(x, sy + 0.2, chW, sh - 0.4, { fill: K.card2, line: K.cyan, lw: 1.5, r: 0.32 }));
    els.push(T(x, sy + 0.2, chW, sh - 0.4, t, { size: 28, align: "center", valign: "middle" }));
  });
  els.push(T(MX, 6.2, CW, 0.5, "We don't claim live toxin detection. We show where to look.", { size: 28, c: K.muted, align: "center" }));
  els.push(...chrome(3, TOTAL));
  slides.push({
    els,
    notes: `[0:35 to 0:55]\nOur ROV, a Remotely Operated Vehicle, scans the water, builds a risk map, flags the spot, and takes a sample exactly there. A lab confirms. We don't claim to detect toxins live. We show where to look.`,
  });
})();

// 4. Working prototype
(() => {
  const y = 2.6, ph = 2.5, pw = 3.43, sw = 4.0, g = (CW - pw - 2 * sw) / 2;
  const x1 = MX, x2 = x1 + pw + g, x3 = x2 + sw + g;
  const photoDir = path.join(ROOT, "assets", "photos");
  const photo = fs.existsSync(photoDir) ? fs.readdirSync(photoDir).filter(f => /\.(jpe?g|png)$/i.test(f)).sort()[0] : null;
  const els = [
    eyebrow("WORKING PROTOTYPE"),
    headline([["It runs. ", {}], ["Live.", { c: K.cyan }]]),
    T(x1, 2.12, pw, 0.4, "REAL ROBOT", { size: 18, b: true, c: K.muted, spacing: 2 }),
    T(x2, 2.12, sw, 0.4, "LAKE SURDUC (MAP)", { size: 18, b: true, c: K.muted, spacing: 2 }),
    T(x3, 2.12, sw, 0.4, "SEA & COAST (CONCEPT)", { size: 18, b: true, c: K.muted, spacing: 2 }),
  ];
  if (photo) {
    els.push(R(x1, y, pw, ph, { fill: K.card, r: 0.12 }));
    els.push({ k: "img", x: x1, y, w: pw, h: ph, file: path.join(photoDir, photo), cover: true });
  } else {
    els.push(R(x1, y, pw, ph, { fill: K.card, line: K.line, lw: 1, r: 0.12 }));
    els.push(S(x1 + 0.22, y + 0.2, pw - 0.44, (pw - 0.44) * 2 / 3, ROV_SVG, "rov-drawing"));
    els.push(T(x1, y + ph - 0.42, pw, 0.35, "Schematic", { size: 18, c: K.muted, align: "center" }));
  }
  [[x2, "app-lake.png"], [x3, "app-sea.png"]].forEach(([x, f]) => {
    els.push(R(x - 0.03, y - 0.03, sw + 0.06, ph + 0.06, { fill: K.line, r: 0.06 }));
    els.push(IMG(x, y, sw, ph, path.join(ROOT, "assets", "screenshots", f), f.includes("sea") ? "Demo app, sea and coast concept, simulated data (S)" : "Demo app, lake dive, simulated data (S)"));
  });
  els.push(T(x1, 5.22, pw, 0.75, "Real robot: Arduino, 2 thrusters, 7.5 m tether.", { size: 20 }));
  els.push(T(x2, 5.22, sw, 0.75, "Real map. Simulated bloom flagged in the west coves.", { size: 20 }));
  els.push(T(x3, 5.22, sw, 0.75, "Algae near a shellfish farm. Harbor: sample for lab.", { size: 20 }));
  const pw2 = (CW - 0.3) / 2;
  els.push(R(MX, 6.12, pw2, 0.62, { fill: K.card, line: K.teal, lw: 1.5, r: 0.31 }));
  els.push(T(MX, 6.12, pw2, 0.62, [["REAL: ", { c: K.teal, b: true }], ["temperature · turbidity · TDS", {}]], { size: 22, align: "center", valign: "middle" }));
  els.push(R(MX + pw2 + 0.3, 6.12, pw2, 0.62, { fill: K.card, line: K.amber, lw: 1.5, r: 0.31 }));
  {
    // Yellow "S" badge, the same mark the app uses for simulated values.
    const px = MX + pw2 + 0.3, bd = 0.44, gap = 0.18, tw = 1.99, gx = px + (pw2 - (bd + gap + tw)) / 2;
    els.push(E(gx, 6.12 + (0.62 - bd) / 2, bd, bd, { fill: K.amber }));
    els.push(T(gx, 6.12 + (0.62 - bd) / 2, bd, bd, [["S", { c: "1B1200", b: true }]], { size: 18, align: "center", valign: "middle" }));
    els.push(T(gx + bd + gap, 6.12, tw + 0.2, 0.62, "everything else", { size: 22, valign: "middle" }));
  }
  els.push(...chrome(4, TOTAL).map(e => (e.k === "text" ? { ...e, y: 6.95 } : e)));
  slides.push({
    els,
    notes: `[0:55 to 1:45, switch to the live app]\nThis is our prototype: a real robot with real temperature, turbidity and TDS sensors. The app runs a simulated dive, clearly labeled. This is the real map of Lake Surduc, with simulated readings. Watch the index rise: the west coves turn orange. We flag it, sample right there. Same platform in the sea: algae near a shellfish farm, and near the harbor where we can't measure metals live, so we send a sample to the lab.\n\nBackup: if the app or USB fails, play the 30 second screen recording and keep talking.`,
  });
})();

// 5. Money: where the money comes from (services first)
(() => {
  const g = 0.25, cw = (CW - 2 * g) / 3, y = 2.05, ch = 3.72;
  const models = [
    ["service", "MAIN", "Services", "We scan, sample and report, per survey or season.", "Our time and a lab handling fee.", K.cyan, true],
    ["wrench", "EVERY MONTH", "Subscription", "Maintenance, calibration, maps, history, alerts.", "Steady monthly income, low extra cost.", K.teal, false],
    ["cube", "LATER", "Robot + sensors", "The robot, extra modules, a solar charging dock.", "Margin on hardware and on each module.", K.blue, false],
  ];
  const els = [
    eyebrow("HOW WE MAKE MONEY"),
    headline([["We earn mostly from ", {}], ["services", { c: K.cyan }], [".", {}]]),
  ];
  models.forEach(([ic, tag, title, pays, profit, col, main], i) => {
    const x = MX + i * (cw + g);
    els.push(R(x, y, cw, ch, { fill: K.card, line: main ? K.cyan : null, lw: 2, r: 0.18 }));
    els.push(...iconDisc(x + 0.25, y + 0.25, 0.7, ic, col));
    els.push(T(x + 1.1, y + 0.42, cw - 1.3, 0.36, tag, { size: 18, b: true, c: col, spacing: 2 }));
    els.push(T(x + 0.25, y + 1.08, cw - 0.4, 0.5, title, { size: 28, b: true }));
    els.push(T(x + 0.25, y + 1.62, cw - 0.4, 1.0, [["Pays for: ", { b: true, c: K.muted }], [pays, {}]], { size: 20 }));
    els.push(T(x + 0.25, y + 2.68, cw - 0.4, 0.95, [["Profit: ", { b: true, c: col }], [profit, {}]], { size: 20 }));
  });
  els.push(T(MX, 5.92, CW, 0.45, [["Mix: ", { b: true, c: K.cyan }], ["service first, then a monthly subscription. Robot sales once it is proven.", { b: true }]], { size: 24, align: "center" }));
  els.push(T(MX, 6.42, CW, 0.36, "For lake managers, fish & shellfish farms, water operators, coastal authorities. Prices set after pilot talks.", { size: 18, c: K.muted, align: "center" }));
  els.push(...chrome(5, TOTAL));
  slides.push({
    els,
    notes: `[1:45 to 2:10]\nMost of our money comes from services: we scan, sample and report, per survey or per season. On top of that comes a monthly subscription: maintenance, calibration, and the data, with maps, history and alerts. Selling or leasing the robot comes later, once it is proven. Our customers are lake managers, fish and shellfish farms, water operators and coastal authorities.`,
  });
})();

// 6. Data flywheel
(() => {
  const cx = W / 2, cy = 4.62, rx = 3.35, ry = 1.22;
  const nodes = [["scan", "Scan"], ["cloud", "Cloud"], ["clock", "History"], ["chart", "Insight"], ["group", "More customers"]];
  const ang = i => (-90 + i * 72) * Math.PI / 180;
  const els = [
    eyebrow("OUR REAL ASSET: DATA"),
    headline([["Every scan adds to\n", {}], ["the history of the water.", { c: K.cyan }]], 1.85),
    E(cx - rx, cy - ry, 2 * rx, 2 * ry, { line: K.line, lw: 2.5 }),
  ];
  // arrowheads at the middle of each arc, pointing clockwise
  for (let i = 0; i < 5; i++) {
    const t = (ang(i) + ang(i + 1)) / 2;
    const px = cx + rx * Math.cos(t), py = cy + ry * Math.sin(t);
    const dx = -rx * Math.sin(t), dy = ry * Math.cos(t);
    els.push(TRI(px, py, 0.26, Math.atan2(dy, dx) * 180 / Math.PI + 90, K.cyan));
  }
  nodes.forEach(([ic, label], i) => {
    const px = cx + rx * Math.cos(ang(i)), py = cy + ry * Math.sin(ang(i));
    const pw = i === 4 ? 3.6 : 2.35, ph = 0.78;
    els.push(R(px - pw / 2, py - ph / 2, pw, ph, { fill: K.card, line: K.cyan, lw: 1.5, r: 0.39 }));
    els.push(I(px - pw / 2 + 0.22, py - 0.24, 0.48, ic, K.cyan));
    els.push(T(px - pw / 2 + 0.8, py - ph / 2, pw - 0.95, ph, label, { size: 26, b: true, valign: "middle" }));
  });
  els.push(T(MX, 6.3, CW, 0.5, "Over time, the history tells you more than any single visit.", { size: 28, align: "center" }));
  els.push(...chrome(6, TOTAL));
  slides.push({
    els,
    notes: `[2:10 to 2:30]\nAnd the real asset is data. Every scan goes to the cloud. Over time we build the history of each water body, and customers subscribe to maps, trends and alerts.`,
  });
})();

// 7. Lakes now, the world next
(() => {
  const base = 6.6, sw = 2.4, g = 0.17;
  const steps = [
    ["wave", "Lakes", "Prototype now.\nPilot idea: a canal in our city.", 3.2, K.teal, "NOW"],
    ["coast", "Coasts & seas", "Salt-water modules", 3.55, K.cyan, "NEXT"],
    ["globe", "Oceans", "The global prize", 3.9, K.blue, "GOAL"],
  ];
  const els = [
    eyebrow("LAKES NOW. THE WORLD NEXT."),
    headline([["Lakes ", {}], ["now", { c: K.cyan }], [". Seas and oceans ", {}], ["next", { c: K.cyan }], [".", {}]]),
  ];
  steps.forEach(([ic, t, s, h, col, tag], i) => {
    const x = MX + i * (sw + g), y = base - h;
    els.push(R(x, y, sw, h, { fill: K.card, line: col, lw: 2, r: 0.16 }));
    els.push(T(x + 0.2, y + 0.22, sw - 0.4, 0.35, tag, { size: 18, b: true, c: col, spacing: 2 }));
    els.push(I(x + 0.2, y + 0.65, 0.55, ic, col));
    els.push(T(x + 0.2, y + 1.3, sw - 0.35, 0.45, t, { size: 24, b: true }));
    els.push(T(x + 0.2, y + 1.8, sw - 0.35, h - 1.9, s, { size: 20, c: K.muted }));
  });
  const px = MX + 3 * sw + 2 * g + 0.3, pw = W - MX - px, ph = 3.9, py = base - ph;
  els.push(R(px, py, pw, ph, { fill: K.card, r: 0.16 }));
  els.push(T(px + 0.3, py + 0.3, pw - 0.6, 0.5, "We need:", { size: 28, b: true }));
  ["A hydrobiologist", "An accredited lab", "A pilot site"].forEach((t, i) => {
    els.push(I(px + 0.3, py + 1.07 + i * 0.66, 0.42, "check", K.teal));
    els.push(T(px + 0.88, py + 1.02 + i * 0.66, pw - 1.05, 0.5, t, { size: 26 }));
  });
  els.push(T(px + 0.3, py + 3.12, pw - 0.5, 0.5, CFG.closer, { size: 26, b: true, c: K.cyan }));
  els.push(...chrome(7, TOTAL));
  slides.push({
    els,
    notes: `[2:30 to 2:50]
We start with lakes, where one scan takes a morning. The big prize is the world's seas and oceans: same platform, salt-water modules. We need a hydrobiologist, an accredited lab, and a pilot site.`,
  });
})();

// 8. Budget: what one pilot season costs (estimates)
(() => {
  const rows = [
    ["Sensors and upgrades", "pH, oxygen, depth, sampler, housing", 0.45, 0.9],
    ["Bloom sensor", "chlorophyll-a fluorometer", 1.5, 4.0],
    ["Lab tests", "24 samples, accredited lab", 1.5, 3.0],
    ["Boat, transport, insurance", "one lake, May to September", 0.5, 1.3],
  ];
  const lx = MX, bx = 5.25, bw = 5.0, tx = bx + bw + 0.25, MAXK = 4.0, y0 = 2.35, rh = 0.78;
  const fmt = v => "€" + (v < 1 ? Math.round(v * 1000) : (Math.round(v * 10) / 10 + "k").replace(".0k", "k"));
  const els = [
    eyebrow("WHAT WE NEED"),
    headline([["One pilot season: ", {}], ["€4k to €9k", { c: K.cyan }]]),
  ];
  rows.forEach(([label, sub, lo, hi], i) => {
    const y = y0 + i * rh;
    els.push(T(lx, y, 4.3, 0.42, label, { size: 24, b: true }));
    els.push(T(lx, y + 0.4, 4.3, 0.32, sub, { size: 18, c: K.muted }));
    els.push(R(bx, y + 0.14, bw * hi / MAXK, 0.4, { fill: K.card2, line: K.line, lw: 1, r: 0.08 }));
    els.push(R(bx, y + 0.14, Math.max(0.12, bw * lo / MAXK), 0.4, { fill: K.cyan, r: 0.08 }));
    els.push(T(tx, y + 0.08, W - MX - tx, 0.5, fmt(lo) + " to " + fmt(hi), { size: 22, b: true }));
  });
  els.push(R(MX, 5.55, CW, 0.7, { fill: K.card, r: 0.16 }));
  els.push(T(MX, 5.55, CW, 0.7, [["Cheapest start: ", { b: true, c: K.cyan }], ["skip the bloom sensor, confirm blooms in the lab. About €2.5k to €5k.", { b: true }]], { size: 22, align: "center", valign: "middle" }));
  els.push(T(MX, 6.38, CW, 0.4, "Later, paid by first customers: solar charging dock, salt-water modules. All figures are estimates until we have quotes.", { size: 18, c: K.muted, align: "center" }));
  els.push(...chrome(8, TOTAL));
  slides.push({
    els,
    notes: `[about 15 s]\nTo run one pilot season on one lake we need about four to nine thousand euro, mostly sensors and lab tests. The cheapest start is about half of that: we skip the bloom sensor and confirm blooms in the lab. The solar charging dock and the salt-water modules come later, paid for by the first customers.`,
  });
})();

// 8. Team (name + role only, order set by the founder, Carmina first)
(() => {
  const team = [
    ["Carmina-Izabela\nCrăciun", "Founder", "f"],
    ["Rebeca\nCiurescu", "Electronics Engineer", "f"],
    ["Davide\nLuca-Sfia", "Software Architect", "m"],
    ["Marina-Adriana\nMercioni", "Medical Advisor", "f"],
    ["Daria\nMihalescu", "Business Administration", "f"],
  ];
  const x0 = 0.6, g = 0.12, cw = (W - 2 * x0 - 4 * g) / 5, y = 2.3, ch = 3.85, av = 1.55;
  const els = [
    eyebrow("TEAM"),
    headline([["The people behind ", {}], [NAME, { c: K.cyan }]]),
  ];
  team.forEach(([n, role, kind], i) => {
    const x = x0 + i * (cw + g);
    els.push(R(x, y, cw, ch, { fill: K.card, line: i === 0 ? K.cyan : null, lw: 1.5, r: 0.18 }));
    els.push(S(x + (cw - av) / 2, y + 0.28, av, av, avatarSvg(kind), "avatar-" + kind));
    els.push(T(x + 0.05, y + 2.0, cw - 0.1, 0.85, n, { size: 22, b: true, align: "center" }));
    els.push(T(x + 0.05, y + 2.9, cw - 0.1, 0.75, role, { size: 20, c: K.cyan, align: "center" }));
  });
  els.push(...chrome(9, TOTAL));
  slides.push({
    els,
    notes: `[2:50 to 3:00]\nBehind this are five of us, covering electronics, software, medicine and business.\n(Do not read the titles. Move to the last slide.)`,
  });
})();

// 9. Thank you
slides.push({
  els: [
    S(W / 2 - 0.5, 1.15, 1.0, 1.0, LOGO, "logo"),
    T(MX, 2.35, CW, 1.4, "Thank you.", { size: 88, b: true, align: "center" }),
    T(MX, 3.85, CW, 0.9, NAME_RUNS(), { size: 48, b: true, align: "center" }),
    T(MX, 4.7, CW, 0.5, CFG.expansion, { size: 28, c: K.muted, align: "center" }),
    T(MX, 5.6, CW, 0.7, CFG.closer, { size: 36, b: true, c: K.cyan, align: "center" }),
  ],
  notes: `Thank you.`,
});

if (slides.length > TOTAL) throw new Error("Deck has more than " + TOTAL + " slides");

// ---------- PPTX renderer ----------
async function svgPng(el, cache) {
  if (!cache[el.key]) {
    const svg = el.svg.replace(/PX/g, "512");
    cache[el.key] = "image/png;base64," + (await sharp(Buffer.from(svg)).resize(512, 512).png().toBuffer()).toString("base64");
  }
  return cache[el.key];
}
function pptRuns(runs, o) {
  const out = [];
  runs.forEach(([text, ro]) => {
    const parts = text.split("\n");
    parts.forEach((p, i) => {
      const last = i === parts.length - 1;
      if (p === "" && last) return;
      out.push({ text: p, options: { color: ro.c || o.c || K.text, bold: ro.b !== undefined ? ro.b : !!o.b, breakLine: !last } });
    });
  });
  return out;
}
async function buildPptx() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.title = NAME;
  pres.author = NAME + " team";
  pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
  const cache = {};
  for (const s of slides) {
    const slide = pres.addSlide();
    slide.background = { color: K.bg };
    for (const el of s.els) {
      if (el.k === "text") {
        const o = el.o;
        slide.addText(pptRuns(el.runs, o), {
          x: el.x, y: el.y, w: el.w, h: el.h, margin: 0, isTextBox: true, fontFace: FONT,
          fontSize: o.size, align: o.align || "left", valign: o.valign || "top",
          charSpacing: o.spacing || 0, lineSpacingMultiple: 1.0, fit: "none",
        });
      } else if (el.k === "rect") {
        const o = el.o;
        slide.addShape(o.r ? pres.ShapeType.roundRect : pres.ShapeType.rect, {
          x: el.x, y: el.y, w: el.w, h: el.h, rectRadius: o.r || 0,
          fill: o.fill ? { color: o.fill } : { color: K.bg, transparency: 100 },
          line: o.line ? { color: o.line, width: o.lw || 1 } : { type: "none" },
        });
      } else if (el.k === "ellipse") {
        const o = el.o;
        slide.addShape(pres.ShapeType.ellipse, {
          x: el.x, y: el.y, w: el.w, h: el.h,
          fill: o.fill ? { color: o.fill } : { color: K.bg, transparency: 100 },
          line: o.line ? { color: o.line, width: o.lw || 1 } : { type: "none" },
        });
      } else if (el.k === "tri") {
        slide.addShape(pres.ShapeType.triangle, { x: el.x, y: el.y, w: el.w, h: el.h, rotate: el.rot, fill: { color: el.color }, line: { type: "none" } });
      } else if (el.k === "line") {
        const o = el.o;
        slide.addShape(pres.ShapeType.line, {
          x: Math.min(el.x1, el.x2), y: Math.min(el.y1, el.y2), w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1),
          flipH: el.x2 < el.x1, flipV: el.y2 < el.y1,
          line: { color: o.c, width: o.w || 1.5, endArrowType: o.arrow ? "triangle" : undefined },
        });
      } else if (el.k === "svg") {
        slide.addImage({ data: await svgPng(el, cache), x: el.x, y: el.y, w: el.w, h: el.h, altText: el.alt || "" });
      } else if (el.k === "img") {
        slide.addImage(el.cover
          ? { path: el.file, x: el.x, y: el.y, w: el.w, h: el.h, sizing: { type: "cover", w: el.w, h: el.h }, altText: "Prototype photo" }
          : { path: el.file, x: el.x, y: el.y, w: el.w, h: el.h, altText: el.alt || "" });
      }
    }
    slide.addNotes(s.notes);
  }
  const file = path.join(OUT, "deck.pptx");
  await pres.writeFile({ fileName: file });
  // Repack without folder entries: some cloud viewers refuse ZIPs that contain them.
  const JSZip = require("jszip");
  const src = await JSZip.loadAsync(fs.readFileSync(file));
  const dst = new JSZip();
  for (const [name, entry] of Object.entries(src.files)) {
    if (!entry.dir) dst.file(name, await entry.async("nodebuffer"), { createFolders: false });
  }
  fs.writeFileSync(file, await dst.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

// ---------- HTML renderer (same geometry, CSS inches and points) ----------
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function htmlEl(el) {
  const box = `left:${el.x}in;top:${el.y}in;width:${el.w}in;height:${el.h}in;`;
  if (el.k === "text") {
    const o = el.o;
    const inner = el.runs.map(([t, ro]) =>
      `<span style="color:#${ro.c || o.c || K.text};font-weight:${(ro.b !== undefined ? ro.b : o.b) ? 700 : 400}">${esc(t).replace(/\n/g, "<br>")}</span>`).join("");
    const jc = o.valign === "middle" ? "center" : "flex-start";
    return `<div class="t" style="${box}font-size:${o.size}pt;text-align:${o.align || "left"};justify-content:${jc};letter-spacing:${o.spacing || 0}pt"><div>${inner}</div></div>`;
  }
  if (el.k === "rect" || el.k === "ellipse") {
    const o = el.o;
    const rad = el.k === "ellipse" ? "50%" : `${o.r || 0}in`;
    return `<div class="s" style="${box}background:${o.fill ? "#" + o.fill : "transparent"};border-radius:${rad};${o.line ? `box-shadow:inset 0 0 0 ${o.lw || 1}pt #${o.line};` : ""}"></div>`;
  }
  if (el.k === "tri") {
    return `<svg class="s" style="${box}transform:rotate(${el.rot}deg)" viewBox="0 0 10 10" preserveAspectRatio="none"><polygon points="5,0 10,10 0,10" fill="#${el.color}"/></svg>`;
  }
  if (el.k === "line") {
    const o = el.o, id = "a" + Math.random().toString(36).slice(2, 8);
    return `<svg class="s" style="left:0;top:0;width:${W}in;height:${H}in" viewBox="0 0 ${W} ${H}"><defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#${o.c}"/></marker></defs><line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}" stroke="#${o.c}" stroke-width="${(o.w || 1.5) / 72}" ${o.arrow ? `marker-end="url(#${id})"` : ""}/></svg>`;
  }
  if (el.k === "svg") return `<div class="s" style="${box}">${el.svg.replace(/width="(PX|512)" height="(PX|512)"/, 'width="100%" height="100%"')}</div>`;
  if (el.k === "img") {
    const rel = path.relative(OUT, el.file).split(path.sep).join("/");
    return `<img class="s" style="${box}object-fit:${el.cover ? "cover" : "fill"};border-radius:${el.cover ? 0.12 : 0.04}in" src="${rel}">`;
  }
  return "";
}
function buildHtml() {
  const body = slides.map((s, i) => `<section class="slide" id="s${i + 1}">${s.els.map(htmlEl).join("")}</section>`).join("\n");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${NAME} deck</title><style>
@page{size:${W}in ${H}in;margin:0}
*{box-sizing:border-box}html,body{margin:0;background:#${K.bg}}
.slide{position:relative;width:${W}in;height:${H}in;background:#${K.bg};overflow:hidden;page-break-after:always;font-family:${FONT},Carlito,sans-serif;color:#${K.text}}
.t{position:absolute;display:flex;flex-direction:column;line-height:1.2;white-space:normal}
.s{position:absolute}
body.one .slide{display:none}body.one .slide.on{display:block}
</style></head><body><script>var m=location.search.match(/s=(\\d+)/);if(m){document.body.className='one';}</script>
${body}
<script>if(m){document.getElementById('s'+m[1]).classList.add('on');}</script></body></html>`;
  fs.writeFileSync(path.join(OUT, "deck.html"), html);
}

// ---------- PDF and PNG via headless Chrome or Edge ----------
function findBrowser() {
  const c = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return c.find(p => fs.existsSync(p));
}
function printPdfAndPngs() {
  const b = findBrowser();
  if (!b) { console.log("No Chrome or Edge found: skipped deck.pdf and PNG renders."); return; }
  const url = "file:///" + path.join(OUT, "deck.html").split(path.sep).join("/");
  const common = ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files"];
  execFileSync(b, [...common, "--no-pdf-header-footer", "--virtual-time-budget=4000", `--print-to-pdf=${path.join(OUT, "deck.pdf")}`, url], { stdio: "ignore" });
  fs.mkdirSync(RENDER, { recursive: true });
  for (let i = 1; i <= slides.length; i++) {
    execFileSync(b, [...common, "--force-device-scale-factor=1.5", "--window-size=1280,720", "--virtual-time-budget=3000",
      `--screenshot=${path.join(RENDER, `slide-${i}.png`)}`, `${url}?s=${i}`], { stdio: "ignore" });
  }
}

(async () => {
  await buildPptx();
  buildHtml();
  printPdfAndPngs();
  console.log(`Built ${slides.length} slides: deck.pptx, deck.html, deck.pdf, render/slide-N.png`);
})().catch(e => { console.error(e); process.exit(1); });
