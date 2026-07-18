import "@yadoran-2025/booong-design-system/dist/booong.css";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://yadoran-2025.github.io"),
  title: "수요곡선 활동 시스템",
  description: "고등학교 경제 수업을 위한 수요곡선 설문 앱",
  alternates: {
    canonical: "/your-own-demand/teacher/",
  },
  openGraph: {
    title: "수요곡선 활동 시스템",
    description: "고등학교 경제 수업을 위한 수요곡선 설문 앱",
    siteName: "수요곡선 활동 시스템",
    type: "website",
    url: "/your-own-demand/teacher/",
  },
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
      <body>
        <nav className="legal-static-links" aria-label="법률 및 운영 안내">
          <a href="/your-own-demand/privacy/">개인정보 처리방침</a>
          <a href="/your-own-demand/terms/">이용약관</a>
          <a href="/your-own-demand/privacy/#contact">문의</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
