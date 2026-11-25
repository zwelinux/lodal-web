import { CONTRIBUTE_URL } from "@/lib/legal";
import Link from "next/link";
import LogoMark from "@/components/LogoMark";
import RedirectIfLoggedIn from "@/components/RedirectIfLoggedIn";

const days = ["Mon 24", "Tue 25", "Wed 26"];
const rows: [string, string[]][] = [
  ["Client Jobs", ["Send invoice", "Meeting 10:00", "Review draft"]],
  ["Content", ["Write ideas", "Edit video", "Post reel"]],
  ["Family", ["Call mum", "Buy a present", "Dinner out"]],
];

export default function Home() {
  return (
    <main className="landing">
      <RedirectIfLoggedIn />
      <header className="landTop">
        <span className="logo">
          <LogoMark />
          Lodal
        </span>
        <Link href="/login" className="btn">
          Sign in
        </Link>
      </header>
      <section className="hero">
        <h1>
          Everything you need to do,
          <br />
          one calm page.
        </h1>
        <p>Subjects on the left. Days across the top. Type in the box. That is all. Works on your phone and your computer.</p>
        <div className="heroActions">
          <Link href="/login" className="btn primary big">
            Continue with Google
          </Link>
          <span className="fine">Free with small ads. Remove them for $1 a month.</span>
        </div>
      </section>
      <section className="preview" aria-hidden="true">
        <div className="pGrid">
          <div />
          {days.map((d) => (
            <div key={d} className="pHead">
              {d}
            </div>
          ))}
          {rows.map(([name, cells]) => (
            <div key={name} style={{ display: "contents" }}>
              <div className="pSubj">{name}</div>
              {cells.map((c) => (
                <div key={c} className="pCell">
                  {c}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
      <footer className="landFoot">
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of use</Link>
        <a href={CONTRIBUTE_URL} target="_blank" rel="noreferrer">
          Contribute to grow Lodal together ♥
        </a>
      </footer>
    </main>
  );
}
