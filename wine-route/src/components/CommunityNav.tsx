import Link from "next/link";

export function CommunityNav({ current }: { current: "feed" | "board" | "ranking" | "rules" | "write" }) {
  const items: [typeof current, string, string][] = [
    ["feed", "/community", "직구 후기"],
    ["board", "/community/board", "자유게시판"],
    ["ranking", "/community/ranking", "랭킹"],
    ["write", "/community/write", "후기 쓰기"],
    ["rules", "/community/rules", "운영 정책"],
  ];
  return (
    <nav className="seg" aria-label="커뮤니티">
      {items.map(([k, href, label]) => <Link key={k} href={href} aria-current={current === k ? "true" : undefined}>{label}</Link>)}
    </nav>
  );
}
