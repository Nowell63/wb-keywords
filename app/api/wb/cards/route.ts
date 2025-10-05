import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: "no token" }, { status: 400 });

  // WB Content API: POST /content/v2/get/cards/list
  // We'll request a small page of cards for selection.
  try {
    const resp = await fetch("https://content-api.wildberries.ru/content/v2/get/cards/list", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token
      },
      body: JSON.stringify({
        sort: { cursor: { limit: 100 }, filter: { withPhoto: -1 } } // 100 товаров максимум
      }),
      // 20s timeout
      cache: "no-store"
    });

    if (!resp.ok) {
      const t = await resp.text();
      return NextResponse.json({ error: "WB error", details: t }, { status: resp.status });
    }
    const data = await resp.json();

    // normalize
    const cards = (data?.cards || []).map((c: any) => ({
      nmID: c.nmID,
      vendorCode: c.vendorCode,
      title: c.title
    }));

    return NextResponse.json({ cards });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
