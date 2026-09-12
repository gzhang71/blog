import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import { getLifePosts, renderMarkdown } from "@/lib/content";

export function generateStaticParams() {
  return getLifePosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getLifePosts().find((p) => p.slug === slug);
  return { title: post?.title ?? "Personal Life", description: post?.summary };
}

export default async function LifePostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getLifePosts().find((p) => p.slug === slug);
  if (!post) notFound();

  return (
    <>
      <article className="reveal">
        <header className="article-head">
          <h1>{post.title}</h1>
          <div className="article-meta">
            <time dateTime={post.date}>{post.date}</time>
            {post.location && <span>· {post.location}</span>}
          </div>
        </header>
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
        />
      </article>

      <Link href="/life" className="back-link">
        ← personal life
      </Link>
      <Footer />
    </>
  );
}
