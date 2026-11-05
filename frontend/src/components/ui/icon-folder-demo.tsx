"use client";

import * as React from "react";
import { IconFolder, DEFAULT_ICONS } from "@/components/ui/icon-folder";

/* Live controls (21st Demo Controls). */
const settings = {
  darkMode: true,
  iconCount: 4,
  spread: 70,
  startOpen: false,
  showPill: true,
};

export default function IconFolderDemo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  const dark = s.darkMode;
  const count = Math.max(1, Math.min(DEFAULT_ICONS.length, Math.round(s.iconCount)));
  const icons = React.useMemo(() => DEFAULT_ICONS.slice(0, count), [count]);
  const tags = React.useMemo(() => icons.map((i) => i.label ?? ""), [icons]);

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-6 py-16"
      style={{
        /* dot grid from the "work with AI" block of vasnev.art */
        backgroundColor: dark ? "#121212" : "#ececea",
        backgroundImage: `radial-gradient(circle, ${dark ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.06)"} 0 1px, transparent 1.4px)`,
        backgroundSize: "20px 13px",
        backgroundPosition: "-6px -1px",
      }}
    >
      <IconFolder
        theme={dark ? "dark" : "light"}
        title="Design"
        tags={tags}
        icons={icons}
        spread={s.spread}
        defaultOpen={s.startOpen}
        showPill={s.showPill}
      />
    </div>
  );
}
