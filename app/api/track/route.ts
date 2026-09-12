import { NextResponse } from "next/server";
import { dayKey, normalizeTarget, toDay, totalKey } from "@/lib/clicks";
import { increment, registerTarget } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const target = normalizeTarget((body as { target?: unknown })?.target);
  if (!target) {
    return NextResponse.json({ error: "invalid target" }, { status: 400 });
  }

  const day = toDay(new Date());
  try {
    const [total] = await Promise.all([
      increment(totalKey(target)),
      increment(dayKey(target, day)),
      registerTarget(target),
    ]);
    return NextResponse.json({ ok: true, target, total });
  } catch (error) {
    console.error("[track] failed", error);
    return NextResponse.json({ error: "store unavailable" }, { status: 503 });
  }
}
