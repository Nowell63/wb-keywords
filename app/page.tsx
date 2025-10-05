"use client";
import { useEffect, useMemo, useState } from "react";
import type { WBCard, KeywordRow, PositionPoint } from "./types";

type Config = {
  token: string;
  nmID: number | null;
  keywords: string[];
  history: Record<string, PositionPoint[]>; // keyword -> series
};

const KEY = "wb-keyword-config-v1";

export default function Page() {
  const [cards, setCards] = useState<WBCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const [token, setToken] = useState("");
  const [nmID, setNmID] = useState<number | null>(null);
  const [keywordsText, setKeywordsText] = useState("Рюкзак\nРюкзак тактический\nРюкзак туристический");

  // Load persisted config
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const cfg: Config = JSON.parse(raw);
      setToken(cfg.token || "");
      setNmID(cfg.nmID);
      setKeywordsText((cfg.keywords || []).join("\n"));
    }
  }, []);

  // Fetch products when token present
  const canLoad = token.trim().length > 20;
  const refreshCards = async () => {
    if (!canLoad) return;
    try {
      setLoadingCards(true);
      const res = await fetch("/api/wb/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      setCards(data.cards || []);
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => { if (canLoad) refreshCards(); }, [canLoad]);

  const keywords = useMemo(() =>
    keywordsText.split(/\n+/).map(s => s.trim()).filter(Boolean), [keywordsText]);

  const selectedCard = useMemo(() => cards.find(c => c.nmID === nmID) || null, [cards, nmID]);

  // Save config
  const saveConfig = () => {
    setSaving(true);
    const cfg: Config = { token, nmID, keywords, history: {} };
    localStorage.setItem(KEY, JSON.stringify(cfg));
    setTimeout(() => setSaving(false), 400);
  };

  // Run daily check
  const [rows, setRows] = useState<KeywordRow[]>([]);

  const runCheck = async () => {
    if (!token || !nmID || keywords.length === 0) return;
    setChecking(true);
    try {
      const res = await fetch("/api/positions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nmID, keywords })
      });
      const data = await res.json();
      setRows(data.rows as KeywordRow[]);
      // persist in localStorage for simple history on next open
      const cfgRaw = localStorage.getItem(KEY);
      const cfg: Config = cfgRaw ? JSON.parse(cfgRaw) : { token, nmID, keywords, history: {} };
      for (const r of data.rows as KeywordRow[]) {
        cfg.history[r.keyword] = r.history;
      }
      cfg.keywords = keywords;
      cfg.nmID = nmID;
      cfg.token = token;
      localStorage.setItem(KEY, JSON.stringify(cfg));
    } finally {
      setChecking(false);
    }
  };

  // Load any saved history to show table immediately
  useEffect(() => {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const cfg: Config = JSON.parse(raw);
      if (cfg.history) {
        const restored: KeywordRow[] = (cfg.keywords || []).map(k => ({
          keyword: k,
          history: cfg.history[k] || []
        }));
        setRows(restored);
      }
    }
  }, []);

  // Dates header from union of all histories
  const dateHeaders = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => r.history.forEach(p => s.add(p.date)));
    return Array.from(s).sort();
  }, [rows]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header: Добавить API */}
      <div className="card p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="grow min-w-[260px]">
            <div className="label">Добавить API (токен Wildberries)</div>
            <input className="input font-mono" placeholder="wb token..." value={token} onChange={e=>setToken(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
            {saving ? "Сохраняю..." : "Сохранить"}
          </button>
          <button className="btn" onClick={refreshCards} disabled={!canLoad || loadingCards}>
            {loadingCards ? "Загрузка товаров..." : "Загрузить товары"}
          </button>
        </div>
      </div>

      {/* Product + keywords */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="label">Выбрать товар (из WB по API)</div>
          <select className="input" value={nmID || ""} onChange={e=>setNmID(e.target.value ? Number(e.target.value) : null)}>
            <option value="">— не выбран —</option>
            {cards.map(c => (
              <option key={c.nmID} value={c.nmID}>
                {c.title || c.vendorCode || "Товар"} (nmID {c.nmID})
              </option>
            ))}
          </select>
          {selectedCard && (
            <div className="mt-2 text-sm text-neutral-600">
              Выбран nmID: <b>{selectedCard.nmID}</b> {selectedCard.vendorCode ? `· Арт: ${selectedCard.vendorCode}` : ""}
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="label">Ключевые слова (по одному на строку)</div>
          <textarea className="input h-40" value={keywordsText} onChange={e=>setKeywordsText(e.target.value)} />
          <div className="mt-2 text-sm text-neutral-600">Всего ключей: {keywords.length}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={runCheck} disabled={!token || !nmID || checking}>
          {checking ? "Проверяю позиции..." : "Проверить позиции сегодня"}
        </button>
        <div className="text-sm text-neutral-600">
          Данные и настройки сохраняются в браузере. Для ежедневной автопроверки — настроим cron на сервере (см. README).
        </div>
      </div>

      {/* Table */}
      <div className="card p-4 overflow-x-auto">
        <div className="flex items-center gap-2 mb-3">
          <img src="/logo.png" alt="" className="w-10 h-10 rounded-lg border border-neutral-200" />
          <div className="text-xl font-semibold">Отслеживание позиций · {selectedCard ? `nmID ${selectedCard.nmID}` : "—"}</div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th className="text-left">Ключ</th>
              {dateHeaders.map(d => <th key={d}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.keyword}>
                <td className="text-left">{r.keyword}</td>
                {dateHeaders.map(d => {
                  const p = r.history.find(h => h.date === d)?.position ?? null;
                  const prevIdx = r.history.findIndex(h => h.date === d) - 1;
                  let delta: number | null = null;
                  if (prevIdx >= 0) {
                    const prev = r.history[prevIdx];
                    if (prev && prev.position !== null && p !== null) delta = prev.position - p;
                  }
                  return (
                    <td key={d}>
                      {p === null ? "—" : p}
                      {delta !== null && delta !== 0 && (
                        <span className={delta > 0 ? "kpos-up" : "kpos-down"}> {delta > 0 ? `+${delta}` : `${delta}`}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
