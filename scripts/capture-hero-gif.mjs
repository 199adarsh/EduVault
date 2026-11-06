/**
 * Records a smooth CampusAxis desktop walkthrough, then encodes Metaflow-scale
 * landing media (~300-450KB), matching metaflow.org's small WebP hero pattern:
 *  - campusaxis-desktop.webp  (primary <picture> source)
 *  - campusaxis-desktop.gif   (fallback <img>)
 *  - campusaxis-desktop.webm / .mp4 (optional companions)
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
const WORK_DIR = path.join(OUT_DIR, '_record');
const BASE = process.env.CAPTURE_URL || 'http://localhost:5173';
const W = 1280;
const H = 800;

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
    return {
      ...s,
      attendance: ((totalAttended / conducted) * 100).toFixed(1),
      cie: String(72 + ((i * 7) % 24)),
      totalConducted: conducted,
      totalAttended,
      stillToGo: Math.max(0, (s.totalScheduled || 54) - conducted),
      detailedAttendance,
    };
  });
}

function getFfmpeg() {
  const requirePy = createRequire(path.join(ROOT, 'package.json'));
  try {
    // Prefer imageio-ffmpeg binary path via python
    const out = execFileSync(
      'python',
      ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8' }
    ).trim();
    if (out && fs.existsSync(out)) return out;
  } catch {
    /* fall through */
  }
  void requirePy;
  return 'ffmpeg';
}

const profile = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'backend', 'data', 'profile.json'), 'utf8')
);
const subjects = enrichSubjects(
  JSON.parse(fs.readFileSync(path.join(ROOT, 'backend', 'data', 'subjects.json'), 'utf8'))
);
const announcements = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'backend', 'data', 'announcements.json'), 'utf8')
);
const notes = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend', 'data', 'notes.json'), 'utf8'));

fs.rmSync(WORK_DIR, { recursive: true, force: true });
fs.mkdirSync(WORK_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: WORK_DIR, size: { width: W, height: H } },
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

async function hideNoise() {
  await page.evaluate(() => {
    document.querySelectorAll('[data-sonner-toaster]').forEach((el) => {
      el.style.display = 'none';
    });
  });
}

async function smoothScroll(distance = 380, durationMs = 1600) {
  await page.evaluate(
    async ({ distance, durationMs }) => {
      const candidates = [
        ...document.querySelectorAll(
          'main, [class*="overflow-y-auto"], [class*="overflow-y-scroll"]'
        ),
      ];
      let el = document.scrollingElement || document.documentElement;
      for (const c of candidates) {
        if (c.scrollHeight > c.clientHeight + 40) {
          el = c;
          break;
        }
      }
      const start = el.scrollTop || 0;
      const end = Math.min(start + distance, el.scrollHeight - el.clientHeight);
      const t0 = performance.now();
      await new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - t0) / durationMs);
          const eased = t * t * (3 - 2 * t);
          el.scrollTop = start + (end - start) * eased;
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    },
    { distance, durationMs }
  );
}

async function smoothScrollTop(durationMs = 900) {
  await page.evaluate(async (durationMs) => {
    const candidates = [
      ...document.querySelectorAll(
        'main, [class*="overflow-y-auto"], [class*="overflow-y-scroll"]'
      ),
    ];
    let el = document.scrollingElement || document.documentElement;
    for (const c of candidates) {
      if (c.scrollHeight > c.clientHeight + 40) {
        el = c;
        break;
      }
    }
    const start = el.scrollTop || 0;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const tick = (now) => {
        const t = Math.min(1, (now - t0) / durationMs);
        const eased = t * t * (3 - 2 * t);
        el.scrollTop = start * (1 - eased);
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

async function clickNav(label) {
  const sidebar = page.locator('aside, nav').first();
  const inSidebar = sidebar.getByRole('link', { name: new RegExp(label, 'i') }).first();
  const fallback = page.getByRole('link', { name: new RegExp(label, 'i') }).first();
  const target = (await inSidebar.count()) > 0 ? inSidebar : fallback;
  await target.click({ timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await new Promise((r) => setTimeout(r, 700));
  await hideNoise();
}

console.log('Recording walkthrough...');
await page.goto(`${BASE}/app`, { waitUntil: 'networkidle', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1800));
await hideNoise();
await page.screenshot({ path: path.join(OUT_DIR, '01-home.png'), type: 'png' });
await new Promise((r) => setTimeout(r, 700));

await smoothScroll(420, 1800);
await new Promise((r) => setTimeout(r, 500));
await smoothScrollTop(1000);
await new Promise((r) => setTimeout(r, 350));

await clickNav('Attendance');
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: path.join(OUT_DIR, '02-attendance.png'), type: 'png' });
await smoothScroll(400, 1700);
await new Promise((r) => setTimeout(r, 450));
await smoothScrollTop(900);

await clickNav('Announcements');
await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: path.join(OUT_DIR, '03-announcements.png'), type: 'png' });
await smoothScroll(300, 1400);
await new Promise((r) => setTimeout(r, 400));
await smoothScrollTop(800);

await clickNav('Home');
await new Promise((r) => setTimeout(r, 1100));

const video = page.video();
await page.close();
const rawVideoPath = await video.path();
await context.close();
await browser.close();

const rawDest = path.join(WORK_DIR, 'raw.webm');
fs.renameSync(rawVideoPath, rawDest);
console.log('Raw video:', rawDest);

const ffmpeg = getFfmpeg();
const webmOut = path.join(OUT_DIR, 'campusaxis-desktop.webm');
const mp4Out = path.join(OUT_DIR, 'campusaxis-desktop.mp4');
const webpOut = path.join(OUT_DIR, 'campusaxis-desktop.webp');
const gifOut = path.join(OUT_DIR, 'campusaxis-desktop.gif');

// High-quality encode. On-page size is controlled by CSS (.lp-screen max-width),
// not by crushing export quality.
console.log('Encoding WebM companion...');
execFileSync(
  ffmpeg,
  [
    '-y',
    '-i',
    rawDest,
    '-an',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '34',
    '-row-mt',
    '1',
    '-deadline',
    'good',
    '-cpu-used',
    '2',
    '-vf',
    'fps=24,scale=960:-2:flags=lanczos',
    webmOut,
  ],
  { stdio: 'inherit' }
);

console.log('Encoding MP4 companion...');
execFileSync(
  ffmpeg,
  [
    '-y',
    '-i',
    rawDest,
    '-an',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    '26',
    '-movflags',
    '+faststart',
    '-vf',
    'fps=24,scale=960:-2:flags=lanczos',
    mp4Out,
  ],
  { stdio: 'inherit' }
);

console.log('Encoding high-quality animated WebP...');
execFileSync(
  ffmpeg,
  [
    '-y',
    '-i',
    rawDest,
    '-an',
    '-vf',
    'fps=16,scale=720:-2:flags=lanczos',
    '-c:v',
    'libwebp',
    '-lossless',
    '0',
    '-compression_level',
    '5',
    '-q:v',
    '75',
    '-loop',
    '0',
    '-preset',
    'picture',
    webpOut,
  ],
  { stdio: 'inherit' }
);

console.log('Encoding high-quality GIF fallback...');
execFileSync(
  ffmpeg,
  [
    '-y',
    '-i',
    rawDest,
    '-an',
    '-vf',
    'fps=14,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192:stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a',
    '-loop',
    '0',
    gifOut,
  ],
  { stdio: 'inherit' }
);

fs.rmSync(WORK_DIR, { recursive: true, force: true });

for (const f of [webpOut, gifOut, webmOut, mp4Out, path.join(OUT_DIR, '01-home.png')]) {
  const st = fs.statSync(f);
  console.log(`${path.basename(f)}: ${(st.size / 1024).toFixed(0)} KB`);
}
console.log('Done. Display size is CSS-limited (~520px), not encode-crushed.');
