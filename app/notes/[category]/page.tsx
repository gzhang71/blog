import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import { getCategories, getCategory, getNotes } from "@/lib/content";

export function generateStaticParams() {
  return getCategories().map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  return { title: cat?.title ?? "Notes", description: cat?.blurb };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();

  const notes = getNotes(category);

  return (
    <>
      <header className="article-head reveal">
        <span className="eyebrow" style={{ marginBottom: 12 }}>
          notes
        </span>
        <h1>{cat.title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {cat.blurb}
        </p>
      </header>

      <section className="reveal">
        {notes.length === 0 ? (
          <div className="empty">Nothing here yet — notes are on the way.</div>
        ) : (
          <div className="note-list">
            {notes.map((n) => (
              <Link
                key={n.slug}
                href={`/notes/${n.category}/${n.slug}`}
                className="note-row"
              >
                <time dateTime={n.date}>{n.date}</time>
                <div className="note-row-body">
                  <h3>{n.title}</h3>
                  <p>{n.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Link href="/notes" className="back-link">
        ← all notes
      </Link>
      <Footer />
    </>
  );
}
