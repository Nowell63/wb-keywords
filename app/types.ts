export type WBCard = {
  nmID: number;
  vendorCode?: string;
  title?: string;
};

export type PositionPoint = {
  date: string; // YYYY-MM-DD
  position: number | null; // null -> нет в топ-100
};

export type KeywordRow = {
  keyword: string;
  history: PositionPoint[]; // последняя точка = сегодня
};
