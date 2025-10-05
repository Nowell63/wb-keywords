import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WB Keyword Tracker",
  description: "Трекинг позиций по ключевым словам (Wildberries)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
