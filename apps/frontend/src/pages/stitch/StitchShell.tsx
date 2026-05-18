import type { ReactNode } from "react";

const navItems = [
  { href: "/stitch_export", label: "서비스 소개" },
  { href: "/stitch_export/jobs", label: "채용 공고" },
  { href: "/stitch_export/ai", label: "자소서 분석" },
  { href: "/stitch_export/career-guide", label: "커리어 가이드" },
  { href: "/stitch_export/activity", label: "내 활동" }
];

export function StitchShell({ children, active }: { children: ReactNode; active: string }) {
  return (
    <main className="stitchOnlyPage">
      <header className="stitchOnlyNav">
        <a className="stitchOnlyBrand" href="/stitch_export">
          일했음 청년
        </a>
        <nav aria-label="stitch export navigation">
          {navItems.map((item) => (
            <a className={active === item.href ? "active" : ""} href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="stitchOnlyNavCta" href="/stitch_export/jobs-filter">
          맞춤 공고 찾기
        </a>
      </header>
      {children}
      <footer className="stitchOnlyFooter">
        <div>
          <strong>일했음 청년</strong>
          <span>From NEET to WORK.</span>
        </div>
        <nav aria-label="stitch export footer links">
          <a href="/stitch_export">GitHub</a>
          <a href="/stitch_export/activity">Team Members</a>
          <a href="/stitch_export/career-guide">React • Express • PostgreSQL • AI</a>
        </nav>
      </footer>
    </main>
  );
}
