import { describe, expect, it } from "vitest";
import { buildCheckoutUrl, intlPhone, orderNote, safeHttpUrl } from "@/lib/checkout";
import { canMove, maskPccc, normalizePccc, parsePostbackStatus } from "@/lib/order";
import { decrypt, encrypt } from "@/server/crypto";

const shipper = {
  email: "a@b.kr",
  firstNameEn: "Gildong",
  lastNameEn: "Hong",
  address1En: "12 Teheran-ro 5-gil, Gangnam-gu",
  address2En: "Apt 101-1203",
  cityEn: "Seoul",
  provinceEn: "Seoul",
  zip: "06134",
  phone: "01012345678",
  pccc: "P123456789012",
  pcccInNote: true,
};

describe("buildCheckoutUrl", () => {
  it("Shopify: 상품·수량을 담고 이메일·배송지·통관부호 메모를 채운다", () => {
    const r = buildCheckoutUrl({ mode: "SHOPIFY_CART", productUrl: "https://shop.example.fr/products/chablis", website: "https://shop.example.fr", checkoutRef: "4455667788", qty: 2, clickId: "clk1", shipper });
    const u = new URL(r.url);
    expect(u.origin + u.pathname).toBe("https://shop.example.fr/cart/4455667788:2");
    expect(u.searchParams.get("checkout[email]")).toBe("a@b.kr");
    expect(u.searchParams.get("checkout[shipping_address][last_name]")).toBe("Hong");
    expect(u.searchParams.get("checkout[shipping_address][zip]")).toBe("06134");
    expect(u.searchParams.get("checkout[shipping_address][country]")).toBe("South Korea");
    expect(u.searchParams.get("checkout[shipping_address][phone]")).toBe("+82 10-1234-5678");
    expect(u.searchParams.get("note")).toContain("P123456789012");
    expect(u.searchParams.get("attributes[wineroute_click]")).toBe("clk1");
    expect(r).toMatchObject({ prefilled: true, cart: true });
  });

  it("Shopify: 비로그인이면 장바구니만 담고, 메모 동의를 끄면 통관부호를 넣지 않는다", () => {
    const anon = buildCheckoutUrl({ mode: "SHOPIFY_CART", productUrl: "https://s.example/p", website: "https://s.example", checkoutRef: "1", qty: 1, clickId: "c" });
    expect(new URL(anon.url).searchParams.has("checkout[email]")).toBe(false);
    expect(anon.prefilled).toBe(false);
    const noNote = buildCheckoutUrl({ mode: "SHOPIFY_CART", productUrl: "https://s.example/p", website: "https://s.example", checkoutRef: "1", qty: 1, clickId: "c", shipper: { ...shipper, pcccInNote: false } });
    expect(new URL(noNote.url).searchParams.has("note")).toBe(false);
  });

  it("variant ID가 없으면 상품 페이지(제휴 링크)로 간다", () => {
    const r = buildCheckoutUrl({ mode: "SHOPIFY_CART", productUrl: "https://s.example/p", website: "https://s.example", qty: 1, clickId: "c9", affiliateTpl: "{url}?aff=1&sub={clickId}" });
    expect(r).toEqual({ url: "https://s.example/p?aff=1&sub=c9", prefilled: false, cart: false });
  });

  it("템플릿 방식은 자리표시자를 인코딩해 치환한다", () => {
    const r = buildCheckoutUrl({ mode: "CART_TEMPLATE", productUrl: "https://w.example/p", website: "https://w.example", cartTpl: "https://w.example/cart/add?sku={ref}&qty={qty}&email={email}&sub={clickId}", checkoutRef: "SKU 1", qty: 3, clickId: "c", shipper });
    expect(r.url).toBe("https://w.example/cart/add?sku=SKU%201&qty=3&email=a%40b.kr&sub=c");
    expect(r.prefilled).toBe(true);
  });

  it("국제 전화번호와 메모, URL 검사", () => {
    expect(intlPhone("010-9876-5432")).toBe("+82 10-9876-5432");
    expect(intlPhone("02-123-4567")).toBe("");
    expect(orderNote({ email: "x", pccc: null })).toBe("");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("주문 상태", () => {
  it("앞으로만 진행하고, 도착·취소 뒤에는 바뀌지 않는다", () => {
    expect(canMove("CLICKED", "SHIPPED")).toBe(true);
    expect(canMove("SHIPPED", "CONFIRMED")).toBe(false);
    expect(canMove("CUSTOMS", "CANCELLED")).toBe(true);
    expect(canMove("DELIVERED", "CANCELLED")).toBe(false);
    expect(canMove("CANCELLED", "CONFIRMED")).toBe(false);
  });
  it("포스트백 상태 값을 읽는다", () => {
    expect(parsePostbackStatus(null)).toBe("CONFIRMED");
    expect(parsePostbackStatus("Fulfilled")).toBe("SHIPPED");
    expect(parsePostbackStatus("refunded")).toBe("CANCELLED");
    expect(parsePostbackStatus("weird")).toBeNull();
  });
  it("통관부호 형식 검사와 가리기", () => {
    expect(normalizePccc("p1234-5678-9012")).toBe("P123456789012");
    expect(normalizePccc("P12345")).toBeNull();
    expect(maskPccc("P123456789012")).toBe("P12••••••9012");
  });
});

describe("암호화", () => {
  it("암호화한 값을 되돌리고, 변조되면 null", () => {
    const t = encrypt("P123456789012");
    expect(t).not.toContain("P123456789012");
    expect(decrypt(t)).toBe("P123456789012");
    expect(decrypt(t.slice(0, -2) + "AA")).toBeNull();
  });
});
