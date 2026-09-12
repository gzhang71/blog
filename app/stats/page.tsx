import ClickChart from "@/components/ClickChart";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Click Trends",
  description: "How often the resume, LinkedIn and GitHub links get clicked.",
};

export default function StatsPage() {
  return (
    <>
      <header className="article-head reveal">
        <span className="eyebrow" style={{ marginBottom: 12 }}>
          analytics
        </span>
        <h1>Click trends</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every outbound link here posts an anonymous counter increment to{" "}
          <code>/api/track</code>, bucketed by UTC day. No cookies, no visitor
          identifiers — just how many times each link was opened.
        </p>
      </header>

      <section className="reveal">
        <ClickChart />
      </section>

      <Footer />
    </>
  );
}
