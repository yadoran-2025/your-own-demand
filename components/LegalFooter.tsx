import Link from "next/link";

export function LegalFooter() {
  return (
    <footer className="legal-footer" aria-label="법률 및 운영 안내">
      <span>copyright BOOONG</span>
      <nav>
        <span>법률 및 운영 안내</span>
        <Link href="/privacy">개인정보 처리방침</Link>
        <Link href="/terms">이용약관</Link>
        <Link href="/privacy#contact">문의</Link>
      </nav>
    </footer>
  );
}
