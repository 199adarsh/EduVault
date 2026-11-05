"use client";

import * as React from "react";

/* ------------------------------------------------------------------ */
/*  Icon Folder — a glass folder with app icons fanned out of it.       */
/*  Pops in when it scrolls into view; hover / tap / Enter spreads the  */
/*  icons wider. The folder tab shape is drawn to the real card width. */
/* ------------------------------------------------------------------ */

export type FolderIcon = {
  /** Image URL of an app icon (square works best). */
  src?: string;
  /** Or any custom node (SVG, emoji, component). */
  node?: React.ReactNode;
  /** Tile background behind `node`. */
  background?: string;
  label?: string;
  href?: string;
};

export type IconFolderProps = {
  title?: string;
  subtitle?: string;
  tags?: string[];
  icons?: FolderIcon[];
  pillIcons?: FolderIcon[];
  theme?: "dark" | "light";
  /** Start spread open (no hover needed). */
  defaultOpen?: boolean;
  /** Horizontal distance between fanned icons, px. */
  spread?: number;
  /** Small icon pill in the corner of the folder. */
  showPill?: boolean;
  className?: string;
};

/* ---------- default content ---------- */

const brand = (d: string) => (
  <svg viewBox="0 0 24 24" width="50%" height="50%" fill="#fff" aria-hidden="true">
    <path d={d} />
  </svg>
);

/* Brand marks via Simple Icons (CC0) and Dashboard Icons. Logos remain trademarks of their owners. */
export const DEFAULT_ICONS: FolderIcon[] = [
  {
    label: "Figma",
    background: "linear-gradient(135deg,#2c2c2c,#141414)",
    node: (
      <svg viewBox="0 0 200 300" width="34%" height="51%" aria-hidden="true">
        <path fill="#0acf83" d="M50 300c27.6 0 50-22.4 50-50v-50H50c-27.6 0-50-22.4-50-50s22.4 50 50 50z" />
        <path fill="#a259ff" d="M0 150c0-27.6 22.4-50 50-50h50v100H50c-27.6 0-50-22.4-50-50z" />
        <path fill="#f24e1e" d="M0 50C0 22.4 22.4 0 50 0h50v100H50C22.4 100 0 77.6 0 50z" />
        <path fill="#ff7262" d="M100 0h50c27.6 0 50 22.4 50 50s-22.4 50-50 50h-50V0z" />
        <path fill="#1abcfe" d="M200 150c0 27.6-22.4 50-50 50s-50-22.4-50-50 22.4-50 50-50 50 22.4 50 50z" />
      </svg>
    ),
  },
  {
    label: "Higgsfield",
    background: "linear-gradient(135deg,#e2ff5a,#c6f500)",
    node: (
      <svg viewBox="40 40 432 432" width="62%" height="62%" aria-hidden="true">
        <path fill="#0a0a0a" d="M419.055 253.911L418.753 250.505C415.893 217.823 395.28 156.334 338.099 156.334C295.668 156.334 263.614 199.548 235.326 237.647C212.754 268.158 193.196 294.333 171.676 294.333C165.956 293.715 158.585 290.771 154.073 284.112C150.009 278.069 148.957 270.326 151.062 261.032C154.37 246.318 173.332 232.688 193.343 218.129C204.325 210.386 215.613 202.176 223.438 194.278C246.011 171.82 257.446 155.557 257.446 129.383C257.446 103.21 243.453 90.1964 231.716 84.6198C208.242 73.471 173.785 79.9756 151.817 99.4937C148.508 102.593 145.195 105.532 142.185 108.32C120.065 128.611 105.17 142.397 71.0117 131.861V174.298C116.304 194.899 154.375 155.557 168.821 137.437C179.954 125.512 191.691 118.541 200.421 118.541H200.874C204.787 118.696 208.095 120.246 210.506 123.034C214.419 127.683 215.924 133.104 215.169 139.142C213.513 151.845 200.723 166.71 177.249 182.974C149.712 202.025 103.669 233.931 100.055 274.046C97.3457 302.857 111.792 331.664 134.364 342.813C187.028 368.523 219.082 324.227 253.085 277.452C279.117 241.364 303.795 207.136 338.103 207.136C368.949 207.136 380.385 233.465 380.385 250.039V253.294L377.375 253.911C302.591 267.542 261.812 339.718 261.812 373.016C261.812 406.317 289.198 434.817 322.903 434.817C362.328 434.817 411.079 400.122 418.905 302.546L419.207 298.986H450.354V253.915L419.055 253.911ZM378.276 303.936C372.259 362.326 343.215 389.588 325.611 389.588C317.636 389.588 306.504 382.771 306.504 370.073C306.504 355.826 327.117 312.612 373.462 299.758L378.879 298.364L378.276 303.936Z" />
      </svg>
    ),
  },
  { label: "Hotjar", background: "linear-gradient(135deg,#ff6a3d,#ff3c00)", node: brand("M10.119 9.814C12.899 8.27 16.704 6.155 16.704 0h-4.609c0 3.444-1.676 4.375-4.214 5.786C5.1 7.33 1.295 9.444 1.295 15.6h4.61c0-3.444 1.676-4.376 4.214-5.786zM18.096 8.4c0 3.444-1.677 4.376-4.215 5.785-2.778 1.544-6.585 3.66-6.585 9.815h4.609c0-3.444 1.676-4.376 4.214-5.786 2.78-1.544 6.586-3.658 6.586-9.814h-4.609z") },
  {
    label: "After Effects",
    background: "linear-gradient(135deg,#1a1a7a,#00005b)",
    node: (
      <svg viewBox="28 26 200 200" width="72%" height="72%" aria-hidden="true">
        <path fill="#99f" d="M102.843 149.333H63.172L55.1 174.454a2.02 2.02 0 0 1-1.901 1.547L32.947 176q-1.72 0-1.202-1.89l34.347-98.509l.343-1.035l.114-.354l.23-.74c.114-.382.228-.787.343-1.226c.45-2.291.68-4.62.687-6.955a1.063 1.063 0 0 1 1.202-1.202h27.306q1.2 0 1.374.859l38.983 109.335q.515 1.718-1.03 1.717h-22.326a1.59 1.59 0 0 1-1.717-1.202zm-33.488-21.181h27.134l-.387-1.277l-.621-2.022l-.909-2.896l-1.745-5.467l-1.662-5.254l-3.092-9.789a336 336 0 0 1-2.46-8.138l-.878-3.096l-.948-3.393l-.866-3.147h-.172a139 139 0 0 1-3.136 12.23l-1.16 3.723l-2.79 9l-1.414 4.585q-.383 1.242-.765 2.456l-.76 2.398l-.756 2.342l-.752 2.284l-.748 2.227q-.559 1.65-1.113 3.234m130.518 11.404h-33.831a24.1 24.1 0 0 0 3.263 9.461a17.67 17.67 0 0 0 7.813 6.44a32.6 32.6 0 0 0 13.653 2.676a62 62 0 0 0 11.077-1.216a40.8 40.8 0 0 0 9.523-2.482q.859-.685.86.858v16.315c.028.445-.061.889-.259 1.288c-.196.312-.46.576-.772.773a43.7 43.7 0 0 1-10.64 3.17a75.5 75.5 0 0 1-15.113 1.287q-11.814 0-19.917-3.545l-.52-.233a36.4 36.4 0 0 1-13.394-10.132a39.7 39.7 0 0 1-7.385-13.996A55.1 55.1 0 0 1 142 134.678a54.1 54.1 0 0 1 2.662-16.916a44.2 44.2 0 0 1 7.985-14.597a38.4 38.4 0 0 1 12.88-10.133c5.037-2.46 10.991-3.343 17.860-3.343a38.8 38.8 0 0 1 16.573 3.263a29.2 29.2 0 0 1 11.248 8.495a39 39 0 0 1 6.354 12.107a43.2 43.2 0 0 1 2.061 13.052q0 3.78-.257 6.87l-.153 1.764l-.16 1.674l-.095.848l-.022.179a1.556 1.556 0 0 1-1.545 1.374l-.471.01l-.587.03l-.457.033l-1.068.091l-.938.093q-.383.04-.795.075l-.851.067l-.909.06l-.965.05l-1.022.043l-.533.018l-1.107.03c-1.095.027-2.217-.041-3.368-.125l-1.746-.128a40 40 0 0 0-2.7-.106m-33.831-15.645h23.386l1.992-.013l1.354-.019l.877-.02l.984-.034a6 6 0 0 0 2.49-.825v-1.03a13.7 13.7 0 0 0-.686-3.95a14.03 14.03 0 0 0-13.910-9.790a14.92 14.92 0 0 0-14.169 8.072a24.8 24.8 0 0 0-2.318 7.61" />
      </svg>
    ),
  },
  { label: "Maze", background: "linear-gradient(135deg,#2b2b2b,#0d0d0d)", node: brand("M1.126 16.547c-1.5013-1.4881-1.5013-3.9009 0-5.389l4.0778-4.042c1.2692-1.258 3.205-1.4525 4.6803-.5836.4564.2687.4524.8852.077 1.2573-.3753.372-.988.34-1.4975.1923-.6524-.1891-1.386-.0287-1.9006.4813l-4.0777 4.0419a1.8935 1.8935 0 0 0 0 2.6945c.7506.744 1.9678.744 2.7184 0l8.1555-8.0836c1.5014-1.4882 3.9355-1.4882 5.437 0l4.0778 4.0418c1.5013 1.4881 1.5013 3.901 0 5.389-1.5014 1.4882-3.9356 1.4882-5.437 0l-1.3593-1.3472-1.699 1.684c-1.2692 1.258-3.205 1.4526-4.6804.5837-.4563-.2687-.4523-.8852-.077-1.2573.3754-.372.988-.34 1.4975-.1923.6524.1892 1.386.0287 1.9006-.4813l1.7476-1.7322c.724-.7175 1.8975-.7175 2.6214 0l1.4078 1.3954c.7507.744 1.9678.744 2.7186 0a1.8936 1.8936 0 0 0 0-2.6945l-4.0779-4.0419c-.7507-.744-1.9678-.744-2.7185 0L6.563 16.5471c-1.5014 1.4882-3.9356 1.4881-5.437 0") },
  { label: "Mixpanel", background: "linear-gradient(135deg,#9478ff,#7856ff)", node: brand("M6.967 9.996h3.053c-.763-.477-1.048-1.145-1.431-2.384L7.443 3.366C6.919 1.458 6.49.551 4.39.551H.004v1.145h.621c1.286 0 1.431.477 1.814 1.908L3.44 7.326c.524 1.814 1.337 2.67 3.53 2.67h-.003Zm7.06 0h3.053c2.194 0 2.956-.86 3.484-2.67l1.001-3.722c.382-1.431.57-1.908 1.814-1.908H24V.551h-4.34c-2.146 0-2.576.86-3.053 2.815l-1.145 4.246c-.384 1.286-.673 1.907-1.435 2.384Zm-4.007 4.008h4.007V9.996H10.02v4.008ZM0 23.449h4.39c2.1 0 2.529-.907 3.053-2.815l1.146-4.246c.383-1.239.668-1.907 1.431-2.384H6.967c-2.194 0-3.007.86-3.531 2.67l-1.001 3.722c-.383 1.431-.524 1.907-1.814 1.907H0v1.146Zm19.65 0h4.343v-1.146h-.622c-1.239 0-1.431-.476-1.814-1.907l-1.001-3.722c-.524-1.814-1.286-2.67-3.483-2.67h-3.046c.762.477 1.041 1.098 1.424 2.384l1.145 4.246c.477 1.955.907 2.815 3.054 2.815Z") },
];

const DEFAULTS = {
  title: "Design",
  tags: ["Figma", "Higgsfield", "Hotjar", "After Effects"],
  icons: DEFAULT_ICONS.slice(0, 4),
};

const THEMES = {
  dark: {
    ink: "#ffffff",
    chipBg: "rgba(255,255,255,.07)",
    chipBorder: "rgba(255,255,255,.14)",
    chipInk: "#e2e8f0",
    back: "linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.01) 60%)",
    backEdge: "rgba(255,255,255,.12)",
    front: "linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.02) 55%),rgba(17,20,24,.94)",
    frontEdge: ["rgba(255,255,255,.36)", "rgba(255,255,255,.12)", "rgba(255,255,255,0)"],
    glow: "rgba(255,255,255,.06)",
    pillBg: "rgba(10,13,18,.88)",
    pillBorder: "rgba(255,255,255,.16)",
    tileRing: "rgba(255,255,255,.16)",
    tileShadow: "rgba(0,0,0,.6)",
    focus: "rgba(255,255,255,.5)",
  },
  light: {
    ink: "#111111",
    chipBg: "rgba(255,255,255,.7)",
    chipBorder: "#e2e2e2",
    chipInk: "#6b6b6b",
    back: "linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.015) 60%)",
    backEdge: "rgba(0,0,0,.08)",
    front: "linear-gradient(160deg,rgba(255,255,255,.95),rgba(255,255,255,.55) 55%),rgba(240,240,238,.7)",
    frontEdge: ["rgba(255,255,255,1)", "rgba(0,0,0,.06)", "rgba(0,0,0,.04)"],
    glow: "rgba(60,44,255,.10)",
    pillBg: "rgba(255,255,255,.8)",
    pillBorder: "rgba(0,0,0,.08)",
    tileRing: "rgba(0,0,0,.08)",
    tileShadow: "rgba(0,0,0,.18)",
    focus: "rgba(0,0,0,.35)",
  },
} as const;

/* folder outlines: front pocket has its tab on the left, back plate on the right */
const pathL = (w: number, h: number, r: number, d: number, tw: number, s: number) =>
  `M0 ${r}A${r} ${r} 0 0 1 ${r} 0L${tw} 0C${tw + s * 0.55} 0 ${tw + s * 0.45} ${d} ${tw + s} ${d}L${w - r} ${d}A${r} ${r} 0 0 1 ${w} ${d + r}L${w} ${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}L${r} ${h}A${r} ${r} 0 0 1 0 ${h - r}Z`;
const pathR = (w: number, h: number, r: number, d: number, tw: number, s: number) => {
  const x = w - tw;
  return `M0 ${d + r}A${r} ${r} 0 0 1 ${r} ${d}L${x - s} ${d}C${x - s * 0.45} ${d} ${x - s * 0.55} 0 ${x} 0L${w - r} 0A${r} ${r} 0 0 1 ${w} ${r}L${w} ${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}L${r} ${h}A${r} ${r} 0 0 1 0 ${h - r}Z`;
};

function useShape(ref: React.RefObject<HTMLDivElement | null>, make: (w: number, h: number) => string) {
  const [d, setD] = React.useState("");
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setD(make(el.offsetWidth, el.offsetHeight)));
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return d;
}

function Tile({ icon, ring, shadow }: { icon: FolderIcon; ring: string; shadow: string }) {
  return (
    <div
      className="grid h-full w-full place-items-center overflow-hidden rounded-[inherit]"
      style={{ background: icon.src ? undefined : icon.background ?? "#2a2a2a", boxShadow: `0 18px 40px ${shadow}, 0 0 0 1px ${ring}` }}
    >
      {icon.src ? <img src={icon.src} alt="" draggable={false} className="h-full w-full object-cover" /> : icon.node}
    </div>
  );
}

export function IconFolder(props: IconFolderProps) {
  const { title, subtitle, tags, icons, pillIcons } = { ...DEFAULTS, ...props };
  const { theme = "dark", defaultOpen = false, spread = 70, showPill = true, className = "" } = props;
  const t = THEMES[theme];
  const gid = React.useId().replace(/:/g, "");

  const rootRef = React.useRef<HTMLDivElement>(null);
  const frontRef = React.useRef<HTMLDivElement>(null);
  const backRef = React.useRef<HTMLDivElement>(null);
  const [shown, setShown] = React.useState(false);
  const [open, setOpen] = React.useState(defaultOpen);
  const [hover, setHover] = React.useState(false);
  const [hi, setHi] = React.useState<number | null>(null);
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => setOpen(defaultOpen), [defaultOpen]);
  React.useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), []);
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const frontD = useShape(frontRef, (w, h) => pathL(w, h, 24, 24, Math.round(w * 0.42), 46));
  const backD = useShape(backRef, (w, h) => pathR(w, h, 24, 24, Math.round(w * 0.4), 46));

  const n = icons.length;
  const rs = n > 1 ? 25 / (n - 1) : 0; // degrees of tilt per step
  const wide = open || hover;
  const lift = wide;
  const ease = "cubic-bezier(.2,.8,.2,1)";
  const toggle = () => setOpen((o) => !o);

  return (
    <div
      ref={rootRef}
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={`${title}: ${tags.join(", ")}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        setHi(null);
      }}
      className={`relative isolate h-[286px] w-full max-w-[420px] cursor-pointer select-none outline-none [-webkit-tap-highlight-color:transparent] focus-visible:rounded-3xl focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 ${className}`}
      style={{
        color: t.ink,
        fontFamily: "'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        letterSpacing: "-0.02em",
        outlineColor: t.focus,
        zIndex: lift ? 2 : undefined,
        opacity: shown || reduced ? 1 : 0,
        transform: shown || reduced ? (lift ? "translateY(-6px) scale(1.02)" : "none") : "translateY(34px) scale(.92)",
        transition: reduced ? "none" : `transform .9s ${ease}, opacity .6s ease`,
      }}
    >
      {/* soft glow behind the folder */}
      <div
        className="pointer-events-none absolute left-[8%] right-[8%] top-10 -z-10 h-[200px] rounded-full opacity-80 blur-[18px]"
        style={{ background: `radial-gradient(closest-side, ${t.glow}, transparent)` }}
      />

      {/* back plate */}
      <div
        ref={backRef}
        className="absolute inset-x-0 bottom-0 top-[14px]"
        style={{ background: t.back, clipPath: backD ? `path('${backD}')` : undefined }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path d={backD} fill="none" stroke={t.backEdge} strokeWidth="2" />
        </svg>
      </div>

      {/* fanned icons */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {icons.map((icon, i) => {
          const k = i - (n - 1) / 2;
          const gap = wide ? spread * 1.15 : spread;
          const y = k * k * 9 - (wide ? 4 : 0);
          const rot = k * rs * (wide ? 1.2 : 1);
          return (
            <div
              key={i}
              className="absolute left-1/2 top-[42px] -ml-[50.5px] h-[101px] w-[101px] rounded-[26px] [backface-visibility:hidden]"
              style={{
                zIndex: hi === i ? 5 : undefined,
                opacity: shown || reduced ? 1 : 0,
                transform: shown || reduced ? `translate3d(${k * gap}px, ${y}px, 0) rotate(${rot}deg)` : `translate3d(${k * spread * 0.6}px, 80px, 0)`,
                transition: reduced ? "none" : `transform ${wide ? 0.6 : 0.9}s ${ease}, opacity .5s`,
                transitionDelay: reduced ? "0s" : wide ? `${i * 0.04}s` : `${0.35 + i * 0.08}s`,
              }}
            >
              <div
                className="pointer-events-auto relative h-full w-full rounded-[inherit]"
                onPointerEnter={(e) => e.pointerType === "mouse" && setHi(i)}
                onPointerLeave={() => setHi((h) => (h === i ? null : h))}
                style={{
                  transform: hi === i ? `translateY(-26px) rotate(${-rot}deg) scale(1.1)` : hi !== null ? "scale(.96)" : "none",
                  filter: hi !== null && hi !== i ? "saturate(.75) brightness(.85)" : "none",
                  transition: reduced ? "none" : `transform .45s ${ease}, filter .3s ease`,
                }}
              >
                <Tile icon={icon} ring={t.tileRing} shadow={t.tileShadow} />
                {icon.label && (
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 mb-2.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium leading-4 backdrop-blur-[8px]"
                    style={{
                      background: t.pillBg,
                      borderColor: t.pillBorder,
                      color: t.ink,
                      opacity: hi === i ? 1 : 0,
                      transform: `translateX(-50%) translateY(${hi === i ? 0 : 6}px)`,
                      transition: reduced ? "none" : `opacity .25s ease, transform .35s ${ease}`,
                    }}
                  >
                    {icon.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* glass front pocket */}
      <div
        ref={frontRef}
        className="absolute inset-x-0 bottom-0 h-[180px] overflow-hidden backdrop-blur-[18px] backdrop-saturate-150"
        style={{
          background: t.front,
          clipPath: frontD ? `path('${frontD}')` : undefined,
          transform: lift ? "translateY(6px)" : "none",
          transition: reduced ? "none" : `transform .6s ${ease}`,
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id={`edge-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={t.frontEdge[0]} />
              <stop offset=".35" stopColor={t.frontEdge[1]} />
              <stop offset="1" stopColor={t.frontEdge[2]} />
            </linearGradient>
          </defs>
          <path d={frontD} fill="none" stroke={`url(#edge-${gid})`} strokeWidth="2" />
        </svg>

        <div className="px-[20px] pt-[26px]">
          <h3
            className="m-0 text-[18px] font-semibold tracking-tight !text-white leading-tight"
            style={{ color: t.ink, fontFamily: "'DM Sans', sans-serif" }}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className="m-0 mt-0.5 text-[11px] text-white/60 font-medium tracking-normal"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="mx-[20px] mt-2.5 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="h-[22px] whitespace-nowrap rounded-md border px-2 text-[11px] font-bold leading-[20px] backdrop-blur-[7px]"
              style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontWeight: "bold",
                background: t.chipBg,
                borderColor: hi !== null && icons[hi]?.label === tag ? t.focus : t.chipBorder,
                color: hi !== null && icons[hi]?.label === tag ? t.ink : t.chipInk,
                transition: "border-color .25s ease, color .25s ease",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {showPill && (
          <div
            className="absolute bottom-3.5 right-3.5 flex h-[34px] items-center gap-1.5 rounded-full border px-1.5 z-20"
            style={{ background: t.pillBg, borderColor: t.pillBorder }}
            onClick={(e) => e.stopPropagation()}
          >
            {(pillIcons || icons).map((icon, i) => {
              const content = (
                <span className="block h-[22px] w-[22px] overflow-hidden rounded-[7px] transition-transform hover:scale-115 active:scale-95 cursor-pointer">
                  <span className="grid h-full w-full place-items-center [&_svg]:h-[58%] [&_svg]:w-[58%]" style={{ background: icon.src ? undefined : icon.background }}>
                    {icon.src ? <img src={icon.src} alt="" className="h-full w-full object-cover" /> : icon.node}
                  </span>
                </span>
              );

              return icon.href ? (
                <a
                  key={i}
                  href={icon.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={icon.label}
                  onClick={(e) => e.stopPropagation()}
                  className="focus:outline-hidden"
                >
                  {content}
                </a>
              ) : (
                <span key={i} title={icon.label}>{content}</span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default IconFolder;

