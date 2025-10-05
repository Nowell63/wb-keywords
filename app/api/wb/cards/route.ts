import { NextRequest, NextResponse } from "next/server";

type WBCard = { nmID: number; vendorCode?: string; title?: string };

type WBListBody = {
  sort: {
    cursor: { limit: number; next: string | null };
    sort: { sortBy: "updateAt"; ascending: boolean };
  };
  filter: {
    textSearch: string;
    withPhoto: -1 | 0 | 1;
  };
};

export async function POST(req: NextRequest) {
  const { token, search = "" } = await req.json();
  if (!token) return NextResponse.json({ error: "no token" }, { status: 400 });

  try {
    const all: WBCard[] = [];
    let next: string | null = null;
    const limit = 100;

    for (let page = 0; page < 100; page++) {
      const body: WBListBody = {
        sort: {
          cursor: { limit, next },
          sort: { sortBy: "updateAt", ascending: false },
        },
        filter: {
          textSearch: search || "",
          withPhoto: -1,
        },
      };

      const resp = await fetch(
        "https://content-api.wildberries.ru/content/v2/get/cards/list",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(body),
          cache: "no-store",
        }
      );

      if (!resp.ok) {
        const t = await resp.text();
        return NextResponse.json(
          { error: "WB error", details: t },
          { status: resp.status }
        );
      }

      const data: any = await resp.json();
      const cards: any[] = data?.cards || [];

      for (const c of cards) {
        all.push({ nmID: c.nmID, vendorCode: c.vendorCode, title: c.title });
      }

      next = data?.cursor?.next ?? null;
      if (!next || cards.length === 0) break;
    }

    const unique = Array.from(new Map(all.map(c => [c.nmID, c])).values());
    return NextResponse.json({ cards: unique });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
