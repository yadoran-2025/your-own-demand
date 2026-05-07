import "@yadoran-2025/booong-design-system/dist/booong.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "수요곡선 활동 시스템",
  description: "고등학교 경제 수업을 위한 수요곡선 조사 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
