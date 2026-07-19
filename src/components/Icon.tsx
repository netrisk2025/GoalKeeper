/** Minimal SVG glyphs — no emoji. */

export function IconSun({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 14.5A7.5 7.5 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClose({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconGear({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.5v2.2M12 19.3V21.5M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12H21.5M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 6.2a5.8 5.8 0 0 1 2.1.4l.6-1.5a7.5 7.5 0 0 1 2.6 1.5l-1.1 1.2c.5.6.9 1.3 1.1 2.1h1.6a7.5 7.5 0 0 1 0 3h-1.6a5.8 5.8 0 0 1-1.1 2.1l1.1 1.2a7.5 7.5 0 0 1-2.6 1.5l-.6-1.5a5.8 5.8 0 0 1-2.1.4 5.8 5.8 0 0 1-2.1-.4l-.6 1.5a7.5 7.5 0 0 1-2.6-1.5l1.1-1.2a5.8 5.8 0 0 1-1.1-2.1H4.3a7.5 7.5 0 0 1 0-3h1.6c.2-.8.6-1.5 1.1-2.1L5.9 6.6a7.5 7.5 0 0 1 2.6-1.5l.6 1.5c.66-.26 1.37-.4 2.1-.4Z"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.35"
      />
    </svg>
  );
}
