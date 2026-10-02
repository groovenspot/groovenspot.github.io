import { getUser } from "@/server/auth";
import { scanProvider } from "@/server/recognize";
import { Scanner } from "@/components/Scanner";

export const dynamic = "force-dynamic";
export const metadata = { title: "라벨 사진 검색" };

export default async function ScanPage() {
  const user = await getUser();
  return (
    <div className="stack-lg">
      <section className="stack" style={{ gap: 6 }}>
        <div className="label">매장에서 꺼내 쓰기</div>
        <h1>라벨을 찍으면 <em>직구 도착가</em>가 나옵니다</h1>
        <p className="lede">와인숍에서 고민될 때, 선물받은 와인이 궁금할 때. 국내가가 더 싸면 솔직히 국내 구매를 권합니다.</p>
      </section>
      <Scanner loggedIn={!!user} photoEnabled={!!scanProvider()} />
    </div>
  );
}
