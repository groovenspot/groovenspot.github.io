import { ImportForm } from "@/components/admin/ImportForm";

export default function ImportPage() {
  return (
    <div className="stack">
      <h1 style={{ fontSize: 28 }}>판매 정보 CSV 가져오기</h1>
      <p className="small muted">셀러가 보내준 가격표나 API 응답을 한 번에 반영합니다. 같은 와인·셀러·용량 조합은 덮어씁니다. 열: wine_id(또는 wine_name), seller_id, url, price, bottle_ml(기본 750), in_stock(0이면 품절).</p>
      <ImportForm />
    </div>
  );
}
