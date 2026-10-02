import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { getUser } from "@/server/auth";
import { compareWine } from "@/server/compare";
import { profileComplete, shipperOf } from "@/server/shipper";
import { CopyFields } from "@/components/CopyFields";
import { intlPhone, orderNote } from "@/lib/checkout";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import { money, sizeLabel, won } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "주문하기" };

type P = { params: Promise<{ offerId: string }>; searchParams: Promise<Record<string, string | undefined>> };

export default async function OrderPage({ params, searchParams }: P) {
  const { offerId } = await params;
  const sp = await searchParams;
  const qty = Math.min(24, Math.max(1, Number(sp.qty) || 1));
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, include: { seller: true, wine: true } });
  if (!offer) notFound();
  const route = (sp.route ?? offer.seller.channel) as ChannelKey;
  const data = await compareWine(offer.wineId, qty, offer.bottleMl);
  const cand = data?.result.routes.flatMap((r) => r.candidates).find((c) => c.offerId === offerId && c.channel === route);
  const user = await getUser();
  const s = user ? shipperOf(user) : null;
  const complete = user ? profileComplete(user) : false;
  const forwarder = route === "FORWARDER";
  const canCart = offer.seller.checkoutMode !== "PRODUCT_PAGE" && (offer.seller.checkoutMode === "CART_TEMPLATE" ? !!offer.seller.cartTpl : !!offer.checkoutRef);
  const goHref = `/go/${offer.id}?qty=${qty}&route=${route}`;
  const here = `/order/${offer.id}?qty=${qty}&route=${route}`;

  const rows = s
    ? [
        { label: "이름 (First name)", value: s.firstNameEn ?? "" },
        { label: "성 (Last name)", value: s.lastNameEn ?? "" },
        { label: "주소 1 (Address)", value: forwarder ? "" : s.address1En ?? "", hint: forwarder ? "배송대행지 주소를 쓰세요" : undefined },
        { label: "주소 2 (Apt, suite)", value: forwarder ? "" : s.address2En ?? "" },
        { label: "도시 (City)", value: forwarder ? "" : s.cityEn ?? "" },
        { label: "시·도 (Province)", value: forwarder ? "" : s.provinceEn ?? "" },
        { label: "우편번호 (ZIP)", value: forwarder ? "" : s.zip ?? "" },
        { label: "국가 (Country)", value: forwarder ? "" : "South Korea" },
        { label: "전화 (Phone)", value: intlPhone(s.phone) },
        { label: "이메일", value: s.email },
        { label: "주문 메모 (Order note)", value: orderNote({ ...s, pcccInNote: true }), hint: "통관부호 입력란이 없으면 메모에" },
        { label: "개인통관고유부호", value: s.pccc ?? "" },
      ]
    : [];

  return (
    <div className="stack-lg" style={{ maxWidth: 860 }}>
      <section className="stack" style={{ gap: 6 }}>
        <div className="label"><Link href={`/wines/${offer.wineId}?qty=${qty}&ml=${offer.bottleMl}`} style={{ textDecoration: "none" }}>← {offer.wine.nameKo}</Link></div>
        <h1 style={{ fontSize: 28 }}>주문하기</h1>
        <p className="lede">결제는 판매처에서 손님이 직접 합니다. 셀러도어는 결제 화면을 열고 주문 진행 상황을 알려드립니다.</p>
      </section>

      <section className="box">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: 4 }}>
            <b>{offer.wine.nameKo}</b>
            <span className="small muted">{offer.wine.name} · {sizeLabel(offer.bottleMl)} × {qty}병</span>
            <span className="small">{ROUTE_LABEL[route] ?? route} · {offer.seller.name}{cand?.forwarder ? ` → ${cand.forwarder.name}` : ""}</span>
          </div>
          {cand && (
            <div className="stack" style={{ gap: 2, alignItems: "flex-end" }}>
              <span className="label">예상 도착가</span>
              <span className="num" style={{ fontSize: 22 }}>{won(cand.total)}</span>
              <span className="small muted">판매처 결제 {money(cand.unitPrice * qty, cand.currency)} + 운임 · 통관 때 세금 약 {won(cand.tax.pay)}</span>
            </div>
          )}
        </div>
      </section>

      <section className="box">
        <h2>1. 판매처 결제 화면 열기</h2>
        <ul className="list">
          {canCart ? <li><b>{qty}병이 장바구니에 담긴 채로</b> 결제 화면이 열립니다.</li> : <li>판매처 상품 페이지가 열립니다. 수량 {qty}병을 담아 주세요.</li>}
          {user && canCart && complete && !forwarder && <li>판매처가 지원하면 <b>이메일·영문 배송지·통관부호(주문 메모)</b>가 미리 채워집니다. 결제 전에 한 번 확인하세요.</li>}
          {forwarder && <li>배송대행지 경로입니다. 배송지는 <b>배송대행지 주소</b>로 입력하고, 배송대행지에 한국 주소와 통관부호를 등록하세요.</li>}
          <li>같은 판매자에게 같은 날 산 물품은 합산과세됩니다.</li>
        </ul>
        {!user && (
          <div className="alert">
            <Link href={`/login?next=${encodeURIComponent(here)}`}>로그인</Link>하면 주문 정보가 자동으로 채워지고, 주문 진행 상황(확정·발송·통관·도착)을 알려드립니다.
          </div>
        )}
        {user && !complete && (
          <div className="alert">
            주문서 정보가 아직 비어 있습니다. <Link href={`/me?next=${encodeURIComponent(here)}#profile`}>영문 주소와 통관부호를 저장</Link>해 두면 다음부터 결제 화면이 미리 채워집니다.
          </div>
        )}
        <div className="row">
          <a className="btn" href={goHref} rel="nofollow sponsored">{offer.seller.name} 결제 화면 열기</a>
          {user && <span className="small muted">결제를 마치면 <Link href="/me#orders">내 주문</Link>에서 진행 상황을 볼 수 있습니다.</span>}
        </div>
      </section>

      {user && (
        <section className="box">
          <div className="row between">
            <h2>2. 주문서에 붙여넣기</h2>
            <Link className="small" href="/me#profile">정보 수정</Link>
          </div>
          <p className="small muted">미리 채워지지 않은 칸은 아래 값을 복사해서 붙여넣으세요. 영문 주소는 판매처 주문서 칸 순서대로 나눠 두었습니다.</p>
          <CopyFields rows={rows} />
        </section>
      )}
    </div>
  );
}
