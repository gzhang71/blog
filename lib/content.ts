/**
 * Filesystem-backed content layer.
 *
 * Notes live in content/notes/<category>/<slug>.md. Adding a category is just
 * adding a folder (an optional _meta.json inside it sets the display title,
 * blurb and ordering); adding a note is adding a markdown file with frontmatter.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const NOTES_DIR = path.join(process.cwd(), "content", "notes");
const LIFE_DIR = path.join(process.cwd(), "content", "life");

export type Note = {
  slug: string;
  category: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  draft: boolean;
  body: string;
};

export type Category = {
  slug: string;
  title: string;
  blurb: string;
  order: number;
  count: number;
};

export type LifePost = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  location: string;
  body: string;
};

function listDirs(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

function listMarkdown(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
}

/** Turn "causal-inference" into "Causal Inference" as a fallback title. */
function titleize(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function readNote(category: string, file: string): Note {
  const raw = fs.readFileSync(path.join(NOTES_DIR, category, file), "utf8");
  const { data, content } = matter(raw);
  return {
    slug: file.replace(/\.md$/, ""),
    category,
    title: data.title ?? titleize(file.replace(/\.md$/, "")),
    date: data.date ? new Date(data.date).toISOString().slice(0, 10) : "",
    summary: data.summary ?? "",
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
    draft: data.draft === true,
    body: content,
  };
}

const byDateDesc = <T extends { date: string }>(a: T, b: T) =>
  b.date.localeCompare(a.date);

export function getCategories(): Category[] {
  return listDirs(NOTES_DIR)
    .map((slug) => {
      const metaPath = path.join(NOTES_DIR, slug, "_meta.json");
      const meta = fs.existsSync(metaPath)
        ? JSON.parse(fs.readFileSync(metaPath, "utf8"))
        : {};
      return {
        slug,
        title: meta.title ?? titleize(slug),
        blurb: meta.blurb ?? "",
        order: typeof meta.order === "number" ? meta.order : 999,
        count: getNotes(slug).length,
      };
    })
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function getCategory(slug: string): Category | undefined {
  return getCategories().find((c) => c.slug === slug);
}

export function getNotes(category?: string): Note[] {
  const categories = category ? [category] : listDirs(NOTES_DIR);
  return categories
    .flatMap((c) => listMarkdown(path.join(NOTES_DIR, c)).map((f) => readNote(c, f)))
    .filter((n) => !n.draft)
    .sort(byDateDesc);
}

export function getNote(category: string, slug: string): Note | undefined {
  const file = path.join(NOTES_DIR, category, `${slug}.md`);
  if (!fs.existsSync(file)) return undefined;
  return readNote(category, `${slug}.md`);
}

export function getLifePosts(): LifePost[] {
  return listMarkdown(LIFE_DIR)
    .map((file) => {
      const raw = fs.readFileSync(path.join(LIFE_DIR, file), "utf8");
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.md$/, ""),
        title: data.title ?? titleize(file.replace(/\.md$/, "")),
        date: data.date ? new Date(data.date).toISOString().slice(0, 10) : "",
        summary: data.summary ?? "",
        location: data.location ?? "",
        body: content,
      };
    })
    .sort(byDateDesc);
}

marked.setOptions({ gfm: true, breaks: false });

export function renderMarkdown(body: string): string {
  return marked.parse(body) as string;
}
