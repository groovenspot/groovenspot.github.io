import Link from "next/link";
import { prisma } from "@/server/db";
import { lwinSearch } from "@/server/catalog";
import { WineCsvForm } from "@/components/admin/WineCsvForm";
import { WINE_CSV_HEADER, WINE_TYPES } from "@/lib/wineCsv";
import { countryKo, lwinTypeKo } from "@/lib/lwin";

export const dynamic = "force-dynamic";
export const metadata = { title: "와인 목록 가져오기" };

export default async function CatalogImport({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [lwinCount, found] = await Promise.all([prisma.lwinRef.count(), sp.lq ? lwinSearch(sp.lq, 20) : Promise.resolve([])]);
  return (
    <div className="stack-lg">
      <div className="row between">
        <h1 style={{ fontSize: 28 }}>와인 목록 가져오기</h1>
        <Link className="btn ghost small" href="/admin/catalog">판매처 수집 대기열</Link>
      </div>

      <section className="box">
        <h2>와인 CSV 대량 등록</h2>
        <p className="small muted">
          한 줄이 와인 하나(빈티지별)입니다. 필수 열: <code>name</code>, <code>name_ko</code>, <code>country</code>(한글), <code>type</code>({WINE_TYPES.join("·")}).
          선택 열: {WINE_CSV_HEADER.filter((h) => !["name", "name_ko", "country", "type"].includes(h)).map((h) => <code key={h} style={{ marginRight: 4 }}>{h}</code>)}.
          LWIN+빈티지, 없으면 원어명+생산자+빈티지가 같은 와인은 갱신합니다. 평점·노트를 넣으면 출처 열도 채워야 합니다. 다른 서비스의 평점·노트를 옮겨 오지 마세요.
        </p>
        <div><a className="btn ghost small" href="/admin/catalog/template">양식 내려받기</a></div>
        <WineCsvForm />
      </section>

      <section className="box" id="lwin">
        <div className="row between">
          <h2>LWIN 표준 와인 목록</h2>
          <span className="small muted">지금 {lwinCount.toLocaleString("ko-KR")}개</span>
        </div>
        <p className="small muted">
          Liv-ex 에서 무료 등록 후 받은 LWIN 데이터베이스(엑셀)를 CSV(UTF-8)로 저장해 올립니다. 이용 조건을 먼저 확인하세요.
          올린 목록은 판매처 상품을 새 와인으로 등록할 때 생산자·산지·종류를 채우고, 같은 와인을 묶는 기준(LWIN 코드)으로 씁니다.
        </p>
        {sp.lwinSaved && <div className="alert ok">LWIN {Number(sp.lwinSaved).toLocaleString("ko-KR")}개를 반영했습니다{Number(sp.lwinSkipped) ? ` (코드가 7자리가 아니거나 이름이 없는 ${sp.lwinSkipped}줄은 건너뜀)` : ""}.</div>}
        {sp.lwinError && <div className="alert bad">{sp.lwinError}</div>}
        <form action="/admin/catalog/lwin" method="post" encType="multipart/form-data" className="row">
          <input name="file" type="file" accept=".csv,text/csv" required aria-label="LWIN CSV 파일" />
          <button className="btn small">올리기</button>
        </form>
        <form action="/admin/catalog/import" method="get" className="row">
          <input name="lq" defaultValue={sp.lq ?? ""} placeholder="LWIN 검색: 예) Chablis Montmains" style={{ flex: "1 1 260px" }} aria-label="LWIN 검색" />
          <button className="btn ghost small">찾기</button>
        </form>
        {sp.lq && (
          found.length ? (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>LWIN</th><th>이름</th><th>생산자</th><th>국가 · 산지</th><th>종류</th></tr></thead>
                <tbody>{found.map((r) => <tr key={r.lwin}><td className="num">{r.lwin}</td><td>{r.displayName}</td><td className="small">{r.producer}</td><td className="small">{countryKo(r.country)} · {r.subRegion || r.region}</td><td className="small">{lwinTypeKo(r.colour, r.type)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="small muted">{lwinCount ? "찾은 와인이 없습니다." : "LWIN 목록을 먼저 올려 주세요."}</p>
        )}
      </section>
    </div>
  );
}
