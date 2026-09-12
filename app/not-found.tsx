import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ padding: "96px 0" }}>
      <span className="eyebrow" style={{ marginBottom: 12 }}>
        404
      </span>
      <h1 style={{ fontSize: "2rem", marginBottom: 12 }}>Nothing here</h1>
      <p className="muted">That page doesn&apos;t exist (or isn&apos;t published yet).</p>
      <Link href="/" className="back-link">
        ← back home
      </Link>
    </div>
  );
}
