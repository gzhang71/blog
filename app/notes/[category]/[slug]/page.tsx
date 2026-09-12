import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import { getCategory, getNote, getNotes, renderMarkdown } from "@/lib/content";

export function generateStaticParams() {
  return getNotes().map((n) => ({ category: n.category, slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const note = getNote(category, slug);
  return { title: note?.title ?? "Note", description: note?.summary };
}

export default async function NotePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const note = getNote(category, slug);
  if (!note || note.draft) notFound();

  const cat = getCategory(category);

  return (
    <>
      <article className="reveal">
        <header className="article-head">
          <h1>{note.title}</h1>
          <div className="article-meta">
            <time dateTime={note.date}>{note.date}</time>
            <span>·</span>
            <Link href={`/notes/${category}`}>{cat?.title ?? category}</Link>
            {note.tags.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        </header>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(note.body) }}
        />
      </article>

      <Link href={`/notes/${category}`} className="back-link">
        ← {cat?.title ?? "notes"}
      </Link>
      <Footer />
    </>
  );
}
