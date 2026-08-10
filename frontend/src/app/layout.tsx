import type { Metadata, Viewport } from "next";
import { ToastHost } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "굿퀘스천",
  description: "좋은 질문이 좋은 생각을 만들어요",
};

export const viewport: Viewport = {
  // 아이가 이야기 진행 중 실수로 확대·축소하지 못하게 한다.
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FFF9F2",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <ToastHost>{children}</ToastHost>
      </body>
    </html>
  );
}
