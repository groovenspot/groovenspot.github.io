import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ROUTE_LABEL, type ChannelKey } from "@/lib/engine";
import { sizeLabel, won, ymd, ymdhm } from "@/lib/format";
import { SHIPMENT_LABEL, SHIPMENT_STAGES, carrierTrackingUrl, customsTrackingUrl, shipmentStageForOrder, trackingConfigured } from "@/lib/tracking";
import { DeliveryConfirmationForm, RefreshTrackingForm, ShipmentStepForm, TrackingRegistrationForm } from "@/components/TrackingForms";

export const dynamic = "force-dynamic";
export const metadata = { title: "통관·배송 추적" };

type Stage = (typeof SHIPMENT_STAGES)[number];
const SOURCE_LABEL: Record<string, string> = { customer: "내 확인", api: "자동 조회", webhook: "자동 조회", seller: "판매처 확인", admin: "운영자 확인", system: "시스템 기록" };
const LEGACY_STAGE: Record<string, Stage> = { SHIPPED: "INTERNATIONAL", CUSTOMS: "CUSTOMS", DELIVERED: "DELIVERED" };
const ERROR_LABEL: Record<string, string> = { provider_unavailable: "배송 조회 서비스에 연결하지 못했어요. 공식 조회를 이용하거나 나중에 다시 시도해 주세요.", invalid_response: "배송 조회 결과를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.", identity_mismatch: "조회 결과와 등록한 운송장이 일치하지 않아요. 번호를 확인해 주세요.", not_configured: "자동 조회가 준비 중이에요. 공식 조회에서 확인할 수 있습니다." };
const CARRIER_LABEL: Record<string, string> = { DHL: "DHL", FEDEX: "FedEx", UPS: "UPS", EMS: "우체국 EMS", CJ: "CJ대한통운", HANJIN: "한진택배", LOTTE: "롯데택배", POST: "우체국택배", LOGEN: "로젠택배", OTHER: "기타 운송사" };

export default async function TrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/tracking/${id}`);
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      wine: true, seller: true, purchase: true, review: { select: { id: true } },
      events: { orderBy: { createdAt: "asc" } }, shipmentEvents: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!order) notFound();

  const cancelled = order.status === "CANCELLED";
  const delivered = order.status === "DELIVERED";
  const stage = shipmentStageForOrder(order.status, order.shipmentStage);
  const configured = trackingConfigured();
  const tax = order.purchase?.taxPaid ?? order.actualTax;
  const difference = tax !== null ? tax - order.estTax : null;
  const overseasUrl = order.carrier && order.trackingNo ? carrierTrackingUrl(order.carrier, order.trackingNo) : null;
  const domesticUrl = order.domesticCarrier && order.domesticTrackingNo ? carrierTrackingUrl(order.domesticCarrier, order.domesticTrackingNo) : null;
  const customsUrl = customsTrackingUrl(order.customsNo ?? order.trackingNo, order.customsYear);
  const confirmedAt = order.events.find((event) => event.status === "CONFIRMED")?.createdAt;
  const estimateStart = confirmedAt ?? order.createdAt;
  const estimateMin = new Date(estimateStart.getTime() + order.seller.daysMin * 86400e3);
  const estimateMax = new Date(estimateStart.getTime() + order.seller.daysMax * 86400e3);

  // 과거 단계의 시각은 실제로 남아 있는 기록에서만 가져옵니다.
  const recorded = new Map<Stage, Date>();
  const recordTime = (key: Stage, value: Date) => {
    const previous = recorded.get(key);
    if (!previous || value < previous) recorded.set(key, value);
  };
  for (const event of [...order.shipmentEvents].reverse()) {
    recordTime(event.stage, event.occurredAt);
  }
  for (const event of order.shipmentEvents.length ? [] : order.events) {
    const eventStage = LEGACY_STAGE[event.status];
    if (eventStage) recordTime(eventStage, event.createdAt);
  }
  if (order.taxNoticeAt) recordTime("TAX_NOTICE", order.taxNoticeAt);
  if (order.deliveredAt) recordTime("DELIVERED", order.deliveredAt);

  const timeline = order.shipmentEvents.map((event) => ({
    id: event.id, stage: event.stage as Stage, source: event.source, occurredAt: event.occurredAt, note: event.note, location: event.location,
  }));
  for (const event of order.shipmentEvents.length ? [] : order.events) {
    const eventStage = LEGACY_STAGE[event.status];
    if (eventStage && !order.shipmentEvents.some((entry) => entry.stage === eventStage)) {
      timeline.push({ id: `order-${event.id}`, stage: eventStage, source: event.by, occurredAt: event.createdAt, note: event.note, location: null });
    }
  }
  timeline.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return (
    <div className="stack-lg tracking-page">
      <section className="stack" style={{ gap: 8 }}>
        <Link href="/me#orders" className="small muted">← 내 주문</Link>
        <div className="row between">
          <h1 style={{ fontSize: 28 }}>통관·배송 한눈에</h1>
          <span className={`chip ${cancelled ? "bad" : delivered ? "ok" : stage ? "best" : ""}`}>
            {cancelled ? "취소된 주문" : stage ? SHIPMENT_LABEL[stage] : "운송장 등록 전"}
          </span>
        </div>
        <p className="lede">해외 발송부터 한국 도착, 통관, 국내 배송까지 한곳에서 확인하세요.</p>
      </section>

      <section className="box">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div className="stack" style={{ gap: 4 }}>
            <Link href={`/wines/${order.wineId}?qty=${order.qty}&ml=${order.bottleMl}`}><h2>{order.wine.nameKo}</h2></Link>
            <p className="small muted">{order.seller.name} · {ROUTE_LABEL[order.route as ChannelKey] ?? order.route} · {order.qty}병 · {sizeLabel(order.bottleMl)}</p>
            {order.orderRef && <p className="small">판매처 주문번호 <span className="num tracking-number">{order.orderRef}</span></p>}
          </div>
          <div className="stack tracking-estimate" style={{ gap: 4 }}>
            <span className="label">{cancelled ? "주문 기록" : delivered ? "수령일" : "예상 도착"}</span>
            {cancelled ? <b>취소된 주문</b> : delivered ? (
              <b className="num">{recorded.get("DELIVERED") ? ymd(recorded.get("DELIVERED")!) : "수령 완료"}</b>
            ) : order.estimatedDeliveryAt ? (
              <><b className="num">{ymd(order.estimatedDeliveryAt)}</b><span className="small muted">배송 조회에서 제공한 예상일</span></>
            ) : (
              <><b className="num">{ymd(estimateMin)} ~ {ymd(estimateMax)}</b><span className="small muted">판매처 안내 {order.seller.daysMin}~{order.seller.daysMax}일 기준 예상<br />{confirmedAt ? "주문 확정일" : "판매처 이동일"} 기준 · 통관 지연 시 달라질 수 있어요</span></>
            )}
          </div>
        </div>

        {!cancelled && (
          <ol className="tracking-stages" aria-label="배송 진행 단계">
            {SHIPMENT_STAGES.map((item, index) => {
              const timestamp = recorded.get(item);
              const current = item === stage;
              return (
                <li key={item} className={`tracking-stage${current ? " tracking-current" : ""}${timestamp ? " tracking-recorded" : ""}`} aria-current={current ? "step" : undefined}>
                  <span className="tracking-stage-dot" aria-hidden="true">{index + 1}</span>
                  <b>{SHIPMENT_LABEL[item]}</b>
                  <span className="tracking-stage-state">{current ? "현재 단계" : timestamp ? "확인됨" : "미확인"}</span>
                  {timestamp ? <time className="small num" dateTime={timestamp.toISOString()}>{ymdhm(timestamp)}</time> : <span className="small muted">기록 없음</span>}
                </li>
              );
            })}
          </ol>
        )}
        {cancelled ? <p className="alert">취소된 주문입니다. 저장된 배송 기록만 확인할 수 있습니다.</p> : <p className="small muted">시각은 한국 시간입니다. 이전 단계의 기록이 없으면 &lsquo;미확인&rsquo;으로 표시합니다.</p>}
      </section>

      <div className="grid-2">
        <section className="box">
          <h2>운송장·공식 조회</h2>
          <dl className="tracking-facts">
            <div><dt>해외 배송</dt><dd>{order.trackingNo ? <>{CARRIER_LABEL[order.carrier?.toUpperCase() ?? ""] ?? order.carrier ?? "운송사 미등록"} <span className="num tracking-number">{order.trackingNo}</span>{overseasUrl && <> · <a href={overseasUrl} target="_blank" rel="noopener noreferrer">운송사 조회 ↗</a></>}</> : "아직 운송장을 등록하지 않았어요"}</dd></div>
            <div><dt>통관 조회</dt><dd><a href={customsUrl} target="_blank" rel="noopener noreferrer">관세청 UNI-PASS ↗</a><span className="small muted"> · 수입화물 진행정보에서 H B/L과 입항 연도로 확인</span>{(order.customsNo || order.trackingNo) && <p className="small">조회 번호 <span className="num tracking-number">{order.customsNo ?? order.trackingNo}</span>{order.customsYear ? ` · ${order.customsYear}년` : ""}</p>}</dd></div>
            <div><dt>국내 배송</dt><dd>{order.domesticTrackingNo ? <>{CARRIER_LABEL[order.domesticCarrier?.toUpperCase() ?? ""] ?? order.domesticCarrier ?? "택배사 미등록"} <span className="num tracking-number">{order.domesticTrackingNo}</span>{domesticUrl && <> · <a href={domesticUrl} target="_blank" rel="noopener noreferrer">택배사 조회 ↗</a></>}</> : "국내 운송장이 발급되면 여기에 표시됩니다"}</dd></div>
          </dl>
          <p className="small muted">{order.trackingSyncedAt ? `최근 자동 조회 ${ymdhm(order.trackingSyncedAt)} (한국 시간)` : "자동 조회 이력이 없습니다."}</p>
          {!configured && <p className="alert">자동 배송 조회를 준비 중입니다. 공식 사이트에서 조회하고 확인한 단계를 직접 기록할 수 있습니다.</p>}
          {order.trackingError && <p className="alert" role="status">최근 조회 안내: {ERROR_LABEL[order.trackingError] ?? "자동 조회를 완료하지 못했어요. 공식 조회를 이용해 주세요."}</p>}
          {!cancelled && !delivered && order.trackingNo && <RefreshTrackingForm id={id} configured={configured} />}
        </section>

        <section className="box">
          <h2>{order.purchase ? "실제 낸 세금" : "세금 고지·예상액"}</h2>
          <dl className="tracking-facts">
            <div><dt>계산기 예상</dt><dd className="num">{won(order.estTax)}</dd></div>
            <div><dt>{order.purchase ? "실제 납부액" : "확인된 고지액"}</dt><dd className="num">{tax !== null ? won(tax) : "아직 확인되지 않았어요"}</dd></div>
            {difference !== null && <div><dt>예상과 차이</dt><dd className={`num ${difference > 0 ? "neg" : "pos"}`}>{difference === 0 ? "예상액과 같아요" : `${difference > 0 ? "+" : "−"}${won(Math.abs(difference))}${order.estTax > 0 ? ` (${Math.abs(difference / order.estTax * 100).toFixed(1)}%)` : ""}`}</dd></div>}
          </dl>
          {order.taxNoticeAt && <p className="small muted">고지 확인 {ymdhm(order.taxNoticeAt)} (한국 시간)</p>}
          <p className="small muted">납부 안내는 관세청 UNI-PASS 또는 운송사 공식 사이트·고객센터에서 확인하세요. 고지서의 주문·화물 번호와 수취인을 확인한 뒤 공식 납부 절차를 따르세요.</p>
          <p className="small muted">예상 세금은 주문 시점 계산값입니다. 통관 환율·원산지 서류·실제 신고금액에 따라 달라질 수 있습니다.</p>
        </section>
      </div>

      {delivered && !cancelled && (
        <section className="box tracking-review">
          <h2>무사히 받으셨나요?</h2>
          {order.review ? <p className="pos">이 주문의 후기를 작성했습니다. 남겨 주신 기록이 다음 구매자에게 도움이 됩니다.</p> : <>
            <p className="small muted">후기를 쓸 때 경로·실제 세금·배송일이 자동으로 채워집니다.</p>
            <div><Link className="btn" href={`/community/write?order=${id}`}>이 주문 후기 쓰기</Link></div>
          </>}
        </section>
      )}

      <section className="box">
        <h2>배송·통관 기록</h2>
        {timeline.length ? <ol className="tracking-timeline">
          {timeline.map((event) => <li key={event.id}>
            <div className="row between"><b>{SHIPMENT_LABEL[event.stage]}</b><time className="num small muted" dateTime={event.occurredAt.toISOString()}>{ymdhm(event.occurredAt)}</time></div>
            <div className="row"><span className={`chip ${event.source === "customer" ? "" : "ok"}`}>{SOURCE_LABEL[event.source] ?? "배송 기록"}</span>{event.location && <span className="small muted">{event.location}</span>}</div>
            {event.note && <p className="small tracking-note">{event.note}</p>}
          </li>)}
        </ol> : <p className="muted small">아직 확인된 배송 기록이 없습니다. 운송장을 등록하고 첫 배송 상태를 확인해 주세요.</p>}
      </section>

      {!cancelled && <>
        {!delivered && <TrackingRegistrationForm key={`${order.trackingNo}-${order.domesticCarrier}-${order.domesticTrackingNo}`} id={id} v={{
          carrier: order.carrier, trackingNo: order.trackingNo, customsNo: order.customsNo, customsYear: order.customsYear,
          domesticCarrier: order.domesticCarrier, domesticTrackingNo: order.domesticTrackingNo,
        }} />}
        {!delivered && order.trackingNo && <ShipmentStepForm key={`${stage ?? "untracked"}-${order.actualTax ?? "unknown"}`} id={id} currentStage={stage} actualTax={order.actualTax} />}
        {(delivered || ["CONFIRMED", "SHIPPED", "CUSTOMS"].includes(order.status)) && <DeliveryConfirmationForm key={`${delivered}-${tax ?? "unknown"}`} id={id} actualTax={tax} delivered={delivered} />}
        <section className="box tight"><div className="row between"><span className="small">직구 준비가 막막하다면 단계별로 확인하세요.</span><Link href={`/guide/first?route=${encodeURIComponent(order.route)}`} className="btn ghost small">첫 직구 도우미</Link></div></section>
      </>}
    </div>
  );
}
