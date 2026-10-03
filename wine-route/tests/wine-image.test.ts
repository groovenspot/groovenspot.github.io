import { describe, expect, it } from "vitest";
import { parseJsonLdProduct, productImage } from "@/lib/crawl/catalog";
import { cleanImageUrl } from "@/lib/wineImage";
import { parseWineCsv } from "@/lib/wineCsv";

const page = (image: unknown) => `<script type="application/ld+json">${JSON.stringify({ "@type": "Product", name: "Chablis 2022", image, offers: { "@type": "Offer", price: "25", priceCurrency: "EUR" } })}</script>`;

describe("병 사진", () => {
  it("JSON-LD image 의 여러 모양을 읽습니다", () => {
    expect(productImage("https://shop.test/a.jpg")).toBe("https://shop.test/a.jpg");
    expect(productImage({ "@type": "ImageObject", url: "https://shop.test/b.jpg" })).toBe("https://shop.test/b.jpg");
    expect(productImage({ contentUrl: "https://shop.test/c.jpg" })).toBe("https://shop.test/c.jpg");
    expect(productImage(["", "https://shop.test/d.jpg", "https://shop.test/e.jpg"])).toBe("https://shop.test/d.jpg");
    expect(productImage("/img/f.jpg", "https://shop.test/p/1")).toBe("https://shop.test/img/f.jpg");
    expect(productImage("http://shop.test/g.jpg", "https://shop.test/p/1")).toBe("https://shop.test/g.jpg");
    expect(productImage("http://shop.test/g.jpg")).toBeNull();
    expect(productImage("data:image/png;base64,AAA")).toBeNull();
    expect(productImage(undefined)).toBeNull();
  });
  it("상품 페이지 파서가 사진 주소를 함께 돌려줍니다", () => {
    expect(parseJsonLdProduct(page(["//cdn.shop.test/h.jpg"]), "https://shop.test/p/1")?.image).toBe("https://cdn.shop.test/h.jpg");
    expect(parseJsonLdProduct(page(undefined))?.image).toBeNull();
  });
  it("관리자 입력은 https 만", () => {
    expect(cleanImageUrl("")).toBeNull();
    expect(cleanImageUrl(" https://x.test/a.png ")).toBe("https://x.test/a.png");
    expect(() => cleanImageUrl("http://x.test/a.png")).toThrow(/https/);
    expect(() => cleanImageUrl("javascript:alert(1)")).toThrow();
  });
  it("와인 CSV: 사진은 출처가 있어야 하고, 비우면 기존 사진을 건드리지 않습니다", () => {
    const head = "name,name_ko,country,type,image_url,image_src";
    const ok = parseWineCsv(`${head}\nChablis,샤블리,프랑스,화이트,https://x.test/a.jpg,생산자 공식 자료`);
    expect(ok.errors).toEqual([]);
    expect(ok.rows[0].wine).toMatchObject({ imageUrl: "https://x.test/a.jpg", imageSrc: "생산자 공식 자료" });
    expect(parseWineCsv(`${head}\nChablis,샤블리,프랑스,화이트,https://x.test/a.jpg,`).errors[0]).toMatch(/image_src/);
    const none = parseWineCsv(`${head}\nChablis,샤블리,프랑스,화이트,,`);
    expect("imageUrl" in none.rows[0].wine).toBe(false);
  });
});
