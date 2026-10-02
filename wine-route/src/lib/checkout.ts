/**
 * 판매처 결제 화면 URL 만들기.
 * 손님이 직접 결제하도록 판매처 화면을 열기만 하고, 플랫폼은 결제·주문에 관여하지 않습니다.
 */
export type CheckoutMode = "PRODUCT_PAGE" | "SHOPIFY_CART" | "CART_TEMPLATE";

export type Shipper = {
  email: string;
  firstNameEn?: string | null;
  lastNameEn?: string | null;
  address1En?: string | null;
  address2En?: string | null;
  cityEn?: string | null;
  provinceEn?: string | null;
  zip?: string | null;
  phone?: string | null;
  pccc?: string | null; // 복호화된 통관부호
  pcccInNote?: boolean;
};

export type CheckoutInput = {
  mode: CheckoutMode;
  productUrl: string;
  website: string; // 판매처 사이트 (Shopify 장바구니 도메인)
  checkoutRef?: string | null; // Shopify variant ID 등
  cartTpl?: string | null;
  affiliateTpl?: string | null;
  qty: number;
  clickId: string;
  shipper?: Shipper | null; // 로그인하고 주문 정보를 저장한 손님
};

export function orderNote(s?: Shipper | null) {
  if (!s?.pccc || s.pcccInNote === false) return "";
  return `Korean customs ID (개인통관고유부호): ${s.pccc}`;
}

/** 국제 형식 휴대폰 번호 (01012345678 → +82 10-1234-5678) */
export function intlPhone(p?: string | null) {
  const d = (p ?? "").replace(/\D/g, "");
  if (!/^01\d{8,9}$/.test(d)) return "";
  const rest = d.slice(1);
  return `+82 ${rest.slice(0, 2)}-${rest.slice(2, rest.length - 4)}-${rest.slice(-4)}`;
}

function affiliate(url: string, tpl: string | null | undefined, clickId: string) {
  return tpl ? tpl.replace("{url}", url).replace("{clickId}", clickId) : url;
}

export function buildCheckoutUrl(i: CheckoutInput): { url: string; prefilled: boolean; cart: boolean } {
  const qty = Math.max(1, Math.floor(i.qty));
  const s = i.shipper;
  const note = orderNote(s);

  if (i.mode === "SHOPIFY_CART" && i.checkoutRef) {
    const origin = new URL(i.website || i.productUrl).origin;
    const u = new URL(`${origin}/cart/${encodeURIComponent(i.checkoutRef)}:${qty}`);
    u.searchParams.set("ref", "cellardoor");
    u.searchParams.set("attributes[cellardoor_click]", i.clickId);
    let prefilled = false;
    if (s) {
      const fields: [string, string | null | undefined][] = [
        ["checkout[email]", s.email],
        ["checkout[shipping_address][first_name]", s.firstNameEn],
        ["checkout[shipping_address][last_name]", s.lastNameEn],
        ["checkout[shipping_address][address1]", s.address1En],
        ["checkout[shipping_address][address2]", s.address2En],
        ["checkout[shipping_address][city]", s.cityEn],
        ["checkout[shipping_address][province]", s.provinceEn],
        ["checkout[shipping_address][zip]", s.zip],
        ["checkout[shipping_address][country]", s.address1En ? "South Korea" : ""],
        ["checkout[shipping_address][phone]", intlPhone(s.phone)],
      ];
      for (const [k, v] of fields) if (v) u.searchParams.set(k, v);
      if (note) u.searchParams.set("note", note);
      prefilled = !!(s.address1En && s.lastNameEn);
    }
    return { url: u.toString(), prefilled, cart: true };
  }

  if (i.mode === "CART_TEMPLATE" && i.cartTpl) {
    const enc = encodeURIComponent;
    const url = i.cartTpl
      .replaceAll("{url}", i.productUrl)
      .replaceAll("{ref}", enc(i.checkoutRef ?? ""))
      .replaceAll("{qty}", String(qty))
      .replaceAll("{clickId}", enc(i.clickId))
      .replaceAll("{email}", enc(s?.email ?? ""))
      .replaceAll("{note}", enc(note));
    return { url, prefilled: !!s?.email && i.cartTpl.includes("{email}"), cart: true };
  }

  return { url: affiliate(i.productUrl, i.affiliateTpl, i.clickId), prefilled: false, cart: false };
}

/** 리다이렉트 대상은 http(s)만 허용 */
export function safeHttpUrl(u: string): URL | null {
  try {
    const x = new URL(u);
    return x.protocol === "https:" || x.protocol === "http:" ? x : null;
  } catch {
    return null;
  }
}
