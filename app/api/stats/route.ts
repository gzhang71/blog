import { NextResponse } from "next/server";
import { dayKey, recentDays, totalKey, type Series } from "@/lib/clicks";
import { listTargets, readMany } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(Number(searchParams.get("days") ?? 30), 7), 180);

  try {
    const targets = (await listTargets()).sort();
    const window = recentDays(days);
    if (targets.length === 0) {
      return NextResponse.json({ days: window, series: [] });
    }

    const keys = targets.flatMap((t) => [
      totalKey(t),
      ...window.map((d) => dayKey(t, d)),
    ]);
    const values = await readMany(keys);

    const stride = window.length + 1;
    const series: Series[] = targets.map((target, i) => {
      const offset = i * stride;
      return {
        target,
        total: values[offset] ?? 0,
        points: window.map((day, j) => ({
          day,
          count: values[offset + 1 + j] ?? 0,
        })),
      };
    });

    return NextResponse.json({ days: window, series });
  } catch (error) {
    console.error("[stats] failed", error);
    return NextResponse.json({ error: "store unavailable" }, { status: 503 });
  }
}
