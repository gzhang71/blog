import Link from "next/link";
import Footer from "@/components/Footer";
import { getLifePosts } from "@/lib/content";

export const metadata = {
  title: "Personal Life",
  description: "Travel, cooking, running, and everything that isn't a model.",
};

export default function LifeIndex() {
  const posts = getLifePosts();

  return (
    <>
      <header className="article-head reveal">
        <span className="eyebrow" style={{ marginBottom: 12 }}>
          personal life
        </span>
        <h1>Away from the terminal</h1>
        <p className="muted" style={{ margin: 0 }}>
          Trips, food, races, and the small projects that have nothing to do with
          work.
        </p>
      </header>

      <section className="life-grid reveal">
        {posts.length === 0 ? (
          <div className="empty">Nothing posted yet.</div>
        ) : (
          posts.map((p) => (
            <Link key={p.slug} href={`/life/${p.slug}`} className="life-card">
              <h3>{p.title}</h3>
              <div className="life-meta">
                <span>{p.date}</span>
                {p.location && <span>· {p.location}</span>}
              </div>
              <p>{p.summary}</p>
            </Link>
          ))
        )}
      </section>

      <Footer />
    </>
  );
}
