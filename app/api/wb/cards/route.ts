import { NextRequest, NextResponse } from "next/server";

type WBCard = { nmID: number; vendorCode?: string; title?: string };

export async function POST(req: NextRequest) {
  const { token, search = "" } = await req.json();
  if (!token) return NextResponse.json({ error: "no token" }, { status: 400 });

  try {
    const all: WBCard[] = [];
    let next: string | null = null; // курсор постраничной выборки
    const limit = 100;

    // крутим страницы, пока WB отдаёт next-курсор
    for (let page = 0; page < 100; page++) { // защитный лимит 10k позиций
      const body = {
        sort: {
          cursor: { limit, next }, // <— ключевой курсор
          sort: { sortBy: "updateAt", ascending: false },
        },
        filter: {
          textSearch: search || "", // пустая строка = все
          withPhoto: -1,            // -1 = все, 0/1 = без/с фото
        },
      };

      const resp = await fetch("https://content-api.wildberries.ru/content/v2/get/cards/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (!resp.ok) {
        const t = await resp.text();
        return NextResponse.json({ error: "WB error", details: t }, { status: resp.status });
      }

      const data = await resp.json();
      const cards = (data?.cards || []) as any[];

      for (const c of cards) {
        all.push({
          nmID: c.nmID,
          vendorCode: c.vendorCode,
          title: c.title,
        });
      }

      // если WB отдал курсор следующей страницы — идём дальше
      next = data?.cursor?.next ?? null;
      if (!next || cards.length === 0) break;
    }

    // убираем дубли на всякий
    const unique = Array.from(new Map(all.map(c => [c.nmID, c])).values());

    return NextResponse.json({ cards: unique });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
