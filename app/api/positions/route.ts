import { NextRequest, NextResponse } from "next/server";

// NOTE: WB официального эндпоинта "позиции товара по поисковому запросу" не предоставляет.
// В этом демо мы возвращаем МОК-данные (случайные позиции 1..300) на последние 10 дней.
// На проде сюда нужно подключить ваш источник позиций (собственный парсер/поставщик данных/внутреннее API).
function generateHistory(days = 10) {
  const arr: { date: string; position: number | null }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const date = d.toISOString().slice(0,10);
    const pos = Math.random() < 0.1 ? null : Math.floor(Math.random() * 300) + 1; // 10% нет в топ-300
    arr.push({ date, position: pos });
  }
  return arr;
}

export async function POST(req: NextRequest) {
  const { token, nmID, keywords } = await req.json();
  if (!token || !nmID || !Array.isArray(keywords)) {
    return NextResponse.json({ error: "token, nmID, keywords required" }, { status: 400 });
  }

  // TODO: заменить на реальную интеграцию позиций.
  const rows = keywords.map((k: string) => ({
    keyword: k,
    history: generateHistory(10)
  }));

  return NextResponse.json({ rows });
}
