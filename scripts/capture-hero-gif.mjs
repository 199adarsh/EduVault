/**
 * Captures a fluid desktop walkthrough of CampusAxis and builds a high-quality
 * looping GIF (scroll + sidebar navigation + crossfades).
 *
 * Usage: node scripts/capture-hero-gif.mjs
 * Requires: frontend `npm run dev` on http://localhost:5173
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(path.join(ROOT, 'frontend', 'package.json'));
const { chromium } = require('playwright');
const OUT_DIR = path.join(ROOT, 'frontend', 'public', 'hero');
const FRAME_DIR = path.join(OUT_DIR, '_frames');
const BASE = process.env.CAPTURE_URL || 'http://localhost:5173';

function pad(n) {
  return String(n).padStart(2, '0');
}

function buildDetailedAttendance(seed, conducted, attendedRate) {
  const records = [];
  const start = new Date('2026-07-14');
  let attended = 0;
  const targetAttended = Math.round(conducted * attendedRate);

  for (let i = 0; i < conducted; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 2 + (seed % 3));
    const shouldPresent =
      attended < targetAttended &&
      (i % 7 !== seed % 7 || attended + (conducted - i) <= targetAttended);
    if (shouldPresent) attended++;
    records.push({
      date: `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`,
      status: shouldPresent ? 'Present' : 'Absent',
      lectureType: i % 5 === 0 ? 'Lab' : 'Theory',
    });
  }
  return records;
}

function enrichSubjects(raw) {
  const rates = [0.82, 0.74, 0.88, 0.91, 0.69, 0.95, 0.78, 0.85];
  return raw.slice(0, 8).map((s, i) => {
    const conducted = s.totalScheduled
      ? Math.min(36, Math.max(18, Math.floor(s.totalScheduled * 0.55)))
      : 28;
    const rate = rates[i % rates.length];
    const detailedAttendance = buildDetailedAttendance(i + 3, conducted, rate);
    const totalAttended = detailedAttendance.filter((r) => r.status === 'Present').length;
    const attendance = ((totalAttended / conducted) * 100).toFixed(1);
    const cie = String(72 + ((i * 7) % 24));
    return {
      ...s,
      attendance,
      cie,
      totalConducted: conducted,
      totalAttended,
      stillToGo: Math.max(0, (s.totalScheduled || 54) - conducted),
      detailedAttendance,
    };
  });
}

const profile = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'backend', 'data', 'profile.json'), 'utf8')
);
const subjectsRaw = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'backend', 'data', 'subjects.json'), 'utf8')
);
const announcements = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'backend', 'data', 'announcements.json'), 'utf8')
);
const notes = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend', 'data', 'notes.json'), 'utf8'));
const subjects = enrichSubjects(subjectsRaw);

fs.rmSync(FRAME_DIR, { recursive: true, force: true });
fs.mkdirSync(FRAME_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1512, height: 945 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();

await page.route('**/api/**', async (route) => {
  const url = route.request().url();
  if (url.includes('/subjects')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(subjects),
    });
  }
  if (url.includes('/notes')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(notes),
    });
  }
  if (url.includes('/announcements')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(announcements),
    });
  }
  if (
    url.includes('/portal') ||
    url.includes('/hackathons') ||
    url.includes('/roadmaps') ||
    url.includes('/nc')
  ) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
});

await page.addInitScript(
  ({ profile, subjects }) => {
    localStorage.setItem('eduvault_profile', JSON.stringify(profile));
    localStorage.setItem('eduvault_subjects', JSON.stringify(subjects));
    localStorage.setItem('eduvault_user_role', 'student');
  },
  { profile, subjects }
);

let frameIndex = 0;
const frameMeta = []; // { file, durationMs }

async function hideChromeNoise() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-sonner-toaster]').forEach((el) => {
      el.style.display = 'none';
    });
  });
}

async function shot(durationMs = 90) {
  await hideChromeNoise();
  const file = path.join(FRAME_DIR, `f-${String(frameIndex).padStart(4, '0')}.png`);
  await page.screenshot({ path: file, type: 'png', animations: 'disabled' });
  frameMeta.push({ file, durationMs });
  frameIndex += 1;
  return file;
}

async function getScrollRoot() {
  return page.evaluateHandle(() => {
    const candidates = [
      ...document.querySelectorAll('main, [class*="overflow-y-auto"], [class*="overflow-y-scroll"]'),
    ];
    for (const el of candidates) {
      if (el.scrollHeight > el.clientHeight + 40) return el;
    }
    return document.scrollingElement || document.documentElement;
  });
}

async function scrollSequence({ distance = 420, steps = 10, settleMs = 700 } = {}) {
  const root = await getScrollRoot();
  for (let i = 1; i <= steps; i++) {
    await page.evaluate(
      ({ el, distance, steps, i }) => {
        const target = distance * (i / steps);
        if (el && typeof el.scrollTo === 'function') {
          el.scrollTo({ top: target, behavior: 'instant' });
        } else {
          window.scrollTo({ top: target, behavior: 'instant' });
        }
      },
      { el: root, distance, steps, i }
    );
    await shot(75);
  }
  await new Promise((r) => setTimeout(r, settleMs));
  await shot(1100);

  // Ease back toward top for the next scene
  for (let i = steps - 1; i >= 0; i--) {
    await page.evaluate(
      ({ el, distance, steps, i }) => {
        const target = distance * (i / steps);
        if (el && typeof el.scrollTo === 'function') {
          el.scrollTo({ top: target, behavior: 'instant' });
        } else {
          window.scrollTo({ top: target, behavior: 'instant' });
        }
      },
      { el: root, distance, steps, i }
    );
    await shot(70);
  }
  await shot(220);
}

async function clickNav(label) {
  // Sidebar labels may include badges (e.g. Attendance 81.8%)
  const sidebar = page.locator('aside, nav').first();
  const inSidebar = sidebar.getByRole('link', { name: new RegExp(label, 'i') }).first();
  const fallback = page.getByRole('link', { name: new RegExp(label, 'i') }).first();
  const target = (await inSidebar.count()) > 0 ? inSidebar : fallback;
  await target.click({ timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise((r) => setTimeout(r, 1000));
}

console.log('Seeding session and opening portal...');
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2200));
await shot(1400);

console.log('Home scroll...');
await scrollSequence({ distance: 520, steps: 12, settleMs: 650 });

console.log('Navigate → Attendance...');
await clickNav('Attendance');
await shot(1200);
await scrollSequence({ distance: 480, steps: 11, settleMs: 600 });

console.log('Navigate → Announcements...');
await clickNav('Announcements');
await shot(1200);
await scrollSequence({ distance: 360, steps: 9, settleMs: 550 });

console.log('Navigate → Home (loop close)...');
await clickNav('Home');
await new Promise((r) => setTimeout(r, 800));
await shot(1500);

// Keep still keyframes for reduced-motion / posters
const keyStill = [
  ['01-home.png', path.join(FRAME_DIR, 'f-0000.png')],
];
for (const [name, src] of keyStill) {
  if (fs.existsSync(src)) fs.copyFileSync(src, path.join(OUT_DIR, name));
}

await browser.close();

console.log(`Captured ${frameMeta.length} frames. Compositing GIF...`);

const metaPath = path.join(FRAME_DIR, 'meta.json');
fs.writeFileSync(metaPath, JSON.stringify(frameMeta, null, 2));

const gifPath = path.join(OUT_DIR, 'campusaxis-desktop.gif');
const pyFile = path.join(FRAME_DIR, '_compose_gif.py');
fs.writeFileSync(
  pyFile,
  `
from PIL import Image
import json, sys
from pathlib import Path

meta_path = Path(sys.argv[1])
out = Path(sys.argv[2])
meta = json.loads(meta_path.read_text(encoding='utf-8'))

MAX_W = 1600
CROSSFADE = 8  # frames between major holds for smoother scene changes
hold_threshold = 500

def load_rgb(path):
    im = Image.open(path).convert('RGB')
    if im.width > MAX_W:
        h = int(im.height * MAX_W / im.width)
        im = im.resize((MAX_W, h), Image.Resampling.LANCZOS)
    return im

def blend(a, b, t):
    return Image.blend(a, b, t)

raw = [(load_rgb(m['file']), int(m['durationMs'])) for m in meta]

# Insert short crossfades whenever duration jumps from motion -> hold
# or between consecutive hold frames that look like scene cuts (duration >= hold_threshold)
composed = []
for i, (im, dur) in enumerate(raw):
    if i > 0:
        prev_im, prev_dur = raw[i - 1]
        # Crossfade into a settled frame after motion, or between two settled scenes
        if dur >= hold_threshold and (prev_dur < hold_threshold or prev_dur >= hold_threshold):
            # Skip tiny duplicate holds; still soften hard cuts between long holds
            if prev_dur >= hold_threshold or prev_dur < 200:
                for step in range(1, CROSSFADE + 1):
                    t = step / (CROSSFADE + 1)
                    # ease-in-out
                    te = t * t * (3 - 2 * t)
                    composed.append((blend(prev_im, im, te), 42))
    composed.append((im, max(40, min(dur, 1600))))

# Shared adaptive palette from a sample of frames for cleaner color
sample = [composed[0][0]]
step = max(1, len(composed) // 10)
for i in range(0, len(composed), step):
    sample.append(composed[i][0])
sample.append(composed[-1][0])

# Build palette from montage strip
w, h = sample[0].size
strip = Image.new('RGB', (w * len(sample), h))
for i, im in enumerate(sample):
    strip.paste(im.resize((w, h), Image.Resampling.LANCZOS), (i * w, 0))
palette = strip.quantize(colors=256, method=Image.Quantize.MEDIANCUT).getpalette()

def to_p(im):
    p = im.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    # Remap toward shared palette when possible
    try:
        base = Image.new('P', im.size)
        base.putpalette(palette)
        return im.quantize(palette=base, dither=Image.Dither.FLOYDSTEINBERG)
    except Exception:
        return p

frames = [to_p(im) for im, _ in composed]
durations = [d for _, d in composed]

frames[0].save(
    out,
    save_all=True,
    append_images=frames[1:],
    duration=durations,
    loop=0,
    optimize=False,
    disposal=2,
)
print(f'Wrote {out} ({len(frames)} frames, {out.stat().st_size / 1024:.0f} KB)')
`
);

execFileSync('python', [pyFile, metaPath, gifPath], { stdio: 'inherit' });

// Refresh still posters from later frames if available
const attendanceStill = frameMeta.find((m) => m.durationMs >= 1000 && m.file.includes('f-'));
// Best-effort: copy first long hold after home as attendance/announcements posters via index groups
const longHolds = frameMeta.filter((m) => m.durationMs >= 1000);
if (longHolds[0]) fs.copyFileSync(longHolds[0].file, path.join(OUT_DIR, '01-home.png'));
if (longHolds[1]) fs.copyFileSync(longHolds[1].file, path.join(OUT_DIR, '02-attendance.png'));
if (longHolds[2]) fs.copyFileSync(longHolds[2].file, path.join(OUT_DIR, '03-announcements.png'));

fs.rmSync(FRAME_DIR, { recursive: true, force: true });
console.log('GIF ready:', gifPath);
