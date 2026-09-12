"use client";

import type { ReactNode } from "react";

/**
 * An outbound link that reports a click to /api/track before the browser
 * leaves. `sendBeacon` survives the navigation; the fetch is only a fallback.
 */
export default function TrackedLink({
  href,
  track,
  className,
  children,
  onMouseMove,
}: {
  href: string;
  track: string;
  className?: string;
  children: ReactNode;
  onMouseMove?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}) {
  function report() {
    const payload = JSON.stringify({ target: track });
    try {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon?.("/api/track", blob)) return;
    } catch {
      /* fall through */
    }
    void fetch("/api/track", {
      method: "POST",
      body: payload,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={report}
      onAuxClick={report}
      onMouseMove={onMouseMove}
    >
      {children}
    </a>
  );
}
