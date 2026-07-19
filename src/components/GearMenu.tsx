import { useEffect, useRef, useState } from "react";
import { IconGear, IconMoon, IconSun } from "./Icon";
import { useAppStore } from "../state/store";
import packageJson from "../../package.json";

const APP_NAME = "GoalKeeper";
const APP_VERSION = packageJson.version ?? "0.1.0";

const LICENSE_SUMMARY = `MIT License

Copyright (c) 2026 netrisk2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.`;

export function GearMenu() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <div className="gk-gear" ref={ref}>
        <button
          type="button"
          className="gk-btn"
          title="Settings"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <IconGear />
        </button>
        {open && (
          <div className="gk-gear-menu" role="menu">
            <button
              type="button"
              className="gk-gear-item"
              role="menuitem"
              onClick={() => {
                setTheme(theme === "light" ? "dark" : "light");
              }}
            >
              <span className="gk-gear-item-icon">
                {theme === "light" ? <IconMoon /> : <IconSun />}
              </span>
              {theme === "light" ? "Dark mode" : "Light mode"}
            </button>
            <div className="gk-gear-sep" />
            <button
              type="button"
              className="gk-gear-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setAboutOpen(true);
              }}
            >
              About
            </button>
          </div>
        )}
      </div>

      {aboutOpen && (
        <div className="gk-modal-backdrop" role="dialog" aria-modal="true" onClick={() => setAboutOpen(false)}>
          <div className="gk-modal gk-filigree-corner" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <img
                src="/branding/goalkeeper-icon.jpg"
                alt=""
                width={56}
                height={56}
                style={{ borderRadius: 10, border: "1px solid var(--gk-line)" }}
              />
              <div>
                <h2 style={{ margin: 0 }}>{APP_NAME}</h2>
                <div className="gk-mono" style={{ color: "var(--gk-muted)" }}>
                  Version {APP_VERSION}
                </div>
              </div>
            </div>
            <div className="gk-ornament-line" style={{ margin: "12px 0" }} />
            <p style={{ margin: "0 0 8px", fontSize: "0.9rem" }}>
              Standalone Goal Structuring Notation (GSN) assurance-case application.
            </p>
            <div className="gk-label">License</div>
            <pre className="gk-pre" style={{ maxHeight: 220, borderRadius: 8 }}>
              {LICENSE_SUMMARY}
            </pre>
            <div className="gk-modal-actions">
              <button type="button" className="gk-btn primary" onClick={() => setAboutOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
