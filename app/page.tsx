import Link from "next/link";
import Footer from "@/components/Footer";
import LinkCards from "@/components/LinkCards";
import { getCategories, getLifePosts, getNotes } from "@/lib/content";
import { site } from "@/lib/site";

export default function HomePage() {
  const categories = getCategories();
  const recent = getNotes().slice(0, 5);
  const life = getLifePosts().slice(0, 2);

  return (
    <>
      <header className="hero reveal">
        <h1>
          Hi, I&apos;m {site.shortName} <span className="wave">👋</span>
        </h1>
        <div className="hero-role">{site.role}</div>
        <p className="hero-tagline">{site.tagline}</p>
        <LinkCards />
      </header>

      <section className="section reveal" style={{ animationDelay: "80ms" }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">notes</span>
            <h2>What I&apos;m working through</h2>
          </div>
          <Link href="/notes" className="mono faint">
            all notes →
          </Link>
        </div>

        <div className="cat-grid">
          {categories.map((c) => (
            <Link key={c.slug} href={`/notes/${c.slug}`} className="cat-card">
              <h3>{c.title}</h3>
              <p>{c.blurb}</p>
              <span className="cat-count">
                {c.count} {c.count === 1 ? "note" : "notes"}
              </span>
            </Link>
          ))}
        </div>

        {recent.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <span className="eyebrow" style={{ marginBottom: 14, display: "flex" }}>
              latest
            </span>
            <div className="note-list">
              {recent.map((n) => (
                <Link
                  key={`${n.category}/${n.slug}`}
                  href={`/notes/${n.category}/${n.slug}`}
                  className="note-row"
                >
                  <time dateTime={n.date}>{n.date}</time>
                  <div className="note-row-body">
                    <h3>{n.title}</h3>
                    <p>{n.summary}</p>
                  </div>
                  <span className="chip">{n.category.replace(/-/g, " ")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="section reveal" style={{ animationDelay: "160ms" }}>
        <div className="section-head">
          <div>
            <span className="eyebrow">personal life</span>
            <h2>Away from the terminal</h2>
          </div>
          <Link href="/life" className="mono faint">
            more →
          </Link>
        </div>

        <div className="life-grid">
          {life.map((p) => (
            <Link key={p.slug} href={`/life/${p.slug}`} className="life-card">
              <h3>{p.title}</h3>
              <div className="life-meta">
                <span>{p.date}</span>
                {p.location && <span>· {p.location}</span>}
              </div>
              <p>{p.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
