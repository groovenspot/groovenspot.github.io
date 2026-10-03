import { ROUTE_ORDER, type ChannelKey } from "./engine";

export const FIRST_GUIDE_SEEN_COOKIE = "cd_first_guide_seen";

export type FirstPurchaseSelection = { offerId: string | null; qty: number; route: ChannelKey };

/** Only validated, local purchase context is carried through login and profile forms. */
export function firstPurchaseSelection(raw: { offerId?: unknown; qty?: unknown; route?: unknown }, fallback: ChannelKey = "EXPORT_RETAILER"): FirstPurchaseSelection {
  const id = typeof raw.offerId === "string" && /^[a-zA-Z0-9_-]{1,120}$/.test(raw.offerId) ? raw.offerId : null;
  const n = Number(raw.qty);
  const qty = Number.isInteger(n) && n >= 1 && n <= 24 ? n : 1;
  const route = ROUTE_ORDER.includes(raw.route as ChannelKey) ? raw.route as ChannelKey : fallback;
  return { offerId: id, qty, route };
}

export function firstPurchaseHref(s: FirstPurchaseSelection, path = "/guide/first") {
  const q = new URLSearchParams({ qty: String(s.qty), route: s.route });
  if (s.offerId) q.set("offerId", s.offerId);
  return `${path}?${q.toString()}`;
}

export function firstPurchaseOrderHref(s: FirstPurchaseSelection) {
  return s.offerId ? `/order/${encodeURIComponent(s.offerId)}?${new URLSearchParams({ qty: String(s.qty), route: s.route, guide: "skip" })}` : "/";
}

export function preparationKey(route: ChannelKey, forwarderId?: string | null) {
  return route === "FORWARDER" && forwarderId ? `${route}:${forwarderId}` : route;
}

export type GuideFlags = {
  pcccIssued: boolean;
  cardChecked: boolean;
  addressConfirmed: boolean;
  preparedRoutes: string[];
};
export type GuideUser = {
  adultVerifiedAt: Date | string | null;
  pcccEnc: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  address1En: string | null;
  cityEn: string | null;
  zip: string | null;
  phone: string | null;
};

export function hasEnglishDeliveryAddress(user: GuideUser | null) {
  if (!user) return false;
  return !!(user.firstNameEn && user.lastNameEn && user.address1En && user.cityEn && user.phone && /^\d{5}$/.test(user.zip ?? ""));
}

/** Registration, verified adulthood and actual tracking are facts, never user checkboxes. */
export function firstPurchaseProgress(user: GuideUser | null, guide: GuideFlags | null, trackingRegistered: boolean, routeKey?: string) {
  const prepared = routeKey ? !!guide?.preparedRoutes.includes(routeKey) : !!guide?.preparedRoutes.some((r) => ROUTE_ORDER.includes(r as ChannelKey) || /^FORWARDER:[a-zA-Z0-9_-]{1,120}$/.test(r));
  const done = [
    !!user?.adultVerifiedAt,
    !!(user?.pcccEnc || guide?.pcccIssued),
    !!guide?.cardChecked,
    !!guide?.addressConfirmed && hasEnglishDeliveryAddress(user),
    prepared,
    trackingRegistered,
  ];
  const count = done.filter(Boolean).length;
  const nextStep = done.findIndex((x) => !x);
  return { done, count, completed: done.every(Boolean), readyToPurchase: done.slice(0, 5).every(Boolean), nextStep: nextStep < 0 ? 6 : nextStep + 1 };
}
