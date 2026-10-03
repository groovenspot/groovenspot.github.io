import Link from "next/link";
import { notFound } from "next/navigation";
import { getUser } from "@/server/auth";
import { prisma } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { maskPccc } from "@/lib/order";
import { firstPurchaseProgress, firstPurchaseSelection } from "@/lib/first-purchase";
import { FirstPurchaseGuide } from "@/components/FirstPurchaseGuide";
import { ROUTE_LABEL } from "@/lib/engine";
import { loadGuideContext } from "./context";

export const dynamic = "force-dynamic";
export const metadata = { title: "첫 직구 도우미" };

export default async function FirstGuidePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const raw = await searchParams;
  const selection = firstPurchaseSelection(raw);
  const context = await loadGuideContext(selection);
  if (!context) notFound();
  const user = await getUser();
  const [guide, registered] = user ? await Promise.all([
    prisma.firstPurchaseGuide.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
    prisma.order.findFirst({ where: { userId: user.id, status: { not: "CANCELLED" }, trackingRegisteredAt: { not: null }, trackingNo: { not: null } }, select: { id: true }, orderBy: { trackingRegisteredAt: "desc" } }),
  ]) : [null, null];
  const progress = firstPurchaseProgress(user, guide, !!registered, context.routeKey);
  const profile = user ? {
    firstNameEn: user.firstNameEn ?? "", lastNameEn: user.lastNameEn ?? "", address1En: user.address1En ?? "", address2En: user.address2En ?? "",
    cityEn: user.cityEn ?? "", provinceEn: user.provinceEn ?? "", zip: user.zip ?? "", phone: user.phone ?? "",
    pcccMasked: maskPccc(decrypt(user.pcccEnc)), pcccInNote: user.pcccInNote,
  } : null;

  return (
    <div className="stack-lg" style={{ maxWidth: 820, margin: "0 auto" }}>
      <section className="stack" style={{ gap: 8 }}>
        <div className="label"><Link href={context.offer ? `/wines/${context.offer.wineId}?qty=${selection.qty}&ml=${context.offer.bottleMl}` : "/"}>← 경로 비교</Link></div>
        <h1>첫 직구 도우미</h1>
        <p className="lede">처음이라도 한 단계씩 준비하면 됩니다. 회원가입부터 주소, 주문 후 운송장 등록까지 함께 확인하세요.</p>
      </section>
      {context.offer && <section className="box tight"><b>{context.offer.wine.nameKo} · {selection.qty}병</b><p className="small muted">{context.offer.seller.name} · {ROUTE_LABEL[selection.route]}{context.forwarder ? ` → ${context.forwarder.name}` : ""}</p>{!context.candidate && <div className="alert">현재 이 경로의 재고·배송 조건을 확인할 수 없습니다. 주문 전에 경로 비교에서 확인해 주세요.</div>}</section>}
      <FirstPurchaseGuide selection={selection} signedIn={!!user} {...progress} profile={profile} forwarder={context.forwarder} purchaseAvailable={(!selection.offerId || !!context.candidate) && (selection.route !== "FORWARDER" || !!context.forwarder)} trackingHref={registered ? `/tracking/${registered.id}` : "/me#orders"} />
    </div>
  );
}
