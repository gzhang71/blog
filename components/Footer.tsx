import Link from "next/link";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="footer">
      <span>
        © {new Date().getFullYear()} {site.name}
      </span>
      <span>
        <Link href="/stats">click trends</Link> · built with Next.js
      </span>
    </footer>
  );
}
