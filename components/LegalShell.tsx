import Link from "next/link";
import LogoMark from "./LogoMark";

/** Simple readable page for the privacy policy and terms. */
export default function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="legal">
      <header className="landTop">
        <Link href="/" className="logo">
          <LogoMark />
          Lodal
        </Link>
        <Link href="/login" className="btn">
          Log in
        </Link>
      </header>
      <article>
        <h1>{title}</h1>
        <p className="fine">Last updated: {updated}</p>
        {children}
      </article>
      <footer className="legalFoot">
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of use</Link>
      </footer>
    </main>
  );
}
