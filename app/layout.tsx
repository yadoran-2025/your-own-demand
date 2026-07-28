import "@yadoran-2025/booong-design-system/dist/booong.css";
import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/components/AuthProvider";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "수요곡선 활동 시스템",
  description: "고등학교 경제 수업을 위한 수요곡선 설문 앱",
  alternates: {
    canonical: "/teacher",
  },
  openGraph: {
    title: "수요곡선 활동 시스템",
    description: "고등학교 경제 수업을 위한 수요곡선 설문 앱",
    siteName: "수요곡선 활동 시스템",
    type: "website",
    url: "/teacher",
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
        <AuthProvider>
        <nav className="legal-static-links" aria-label="법률 및 운영 안내">
          <a href="/privacy/">개인정보 처리방침</a>
          <a href="/terms/">이용약관</a>
          <a href="/privacy/#contact">문의</a>
        </nav>
        {children}
        </AuthProvider>
      </body>
    </html>
  );
}
