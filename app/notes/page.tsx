import Link from "next/link";
import Footer from "@/components/Footer";
import { getCategories, getNotes, getNotesByTag } from "@/lib/content";

export const metadata = {
  title: "Notes",
  description: "Working notes on LLMs, causal inference, recommendations and more.",
};

export default function NotesIndex() {
  const categories = getCategories();
  const notes = getNotes();
  const papers = getNotesByTag("paper");

  return (
    <>
      <header className="article-head reveal">
        <h1>Notes</h1>
        <p className="muted" style={{ margin: 0 }}>
          Things I&apos;ve had to figure out, written down so I only have to
          figure them out once.
        </p>
      </header>

      <section className="reveal">
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
      </section>

      {papers.length > 0 && (
        <section className="section reveal">
          <div className="section-head">
            <div>
              <span className="eyebrow">paper notes</span>
              <h2>Papers I&apos;ve read closely</h2>
            </div>
            <span className="mono faint">{papers.length}</span>
          </div>
          <div className="note-list">
            {papers.map((n) => (
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
        </section>
      )}

      <section className="section reveal">
        <div className="section-head">
          <div>
            <span className="eyebrow">everything</span>
            <h2>All notes</h2>
          </div>
        </div>
        <div className="note-list">
          {notes.map((n) => (
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
      </section>

      <Footer />
    </>
  );
}
