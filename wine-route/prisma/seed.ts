/**
 * 개발·시연용 예시 데이터. 판매처·가격·운임·국내가는 모두 예시이며 실제 판매가와 다릅니다.
 * 실제 운영 데이터는 관리자 화면(셀러 등록, CSV 가져오기)과 크롤링으로 채웁니다.
 */
import { PrismaClient, type Channel } from "@prisma/client";
import { DEFAULT_TAX } from "../src/lib/tax";

const prisma = new PrismaClient();

const FX: Record<string, number> = { USD: 1390, EUR: 1625, AUD: 915, NZD: 805, HKD: 178.6, GBP: 1860, JPY: 9.3 };

type SellerSeed = {
  key: string;
  name: string;
  country: string;
  channel: Channel;
  currency: string;
  shipBase: number;
  shipPerBottle: number;
  daysMin: number;
  daysMax: number;
  shipsToKorea?: boolean;
  insured?: boolean;
  shopify?: boolean; // 예시: Shopify 장바구니 링크 지원
};

const SELLERS: SellerSeed[] = [
  // 프랑스
  { key: "fr-direct", name: "예시 와이너리 직판몰 (프랑스)", country: "프랑스", channel: "WINERY_DIRECT", currency: "EUR", shipBase: 26, shipPerBottle: 8.5, daysMin: 7, daysMax: 14, shopify: true },
  { key: "fr-export", name: "예시 수출 리테일러 파리", country: "프랑스", channel: "EXPORT_RETAILER", currency: "EUR", shipBase: 24, shipPerBottle: 7.5, daysMin: 7, daysMax: 12, insured: true },
  { key: "fr-local", name: "예시 내수 와인숍 (프랑스)", country: "프랑스", channel: "LOCAL_SHOP", currency: "EUR", shipBase: 7.9, shipPerBottle: 1.2, daysMin: 2, daysMax: 4, shipsToKorea: false },
  // 독일
  { key: "de-direct", name: "예시 와이너리 직판몰 (독일)", country: "독일", channel: "WINERY_DIRECT", currency: "EUR", shipBase: 24, shipPerBottle: 8, daysMin: 7, daysMax: 14 },
  { key: "de-export", name: "예시 수출 리테일러 마인츠", country: "독일", channel: "EXPORT_RETAILER", currency: "EUR", shipBase: 22, shipPerBottle: 7, daysMin: 7, daysMax: 12, insured: true },
  { key: "de-local", name: "예시 내수 와인숍 (독일)", country: "독일", channel: "LOCAL_SHOP", currency: "EUR", shipBase: 6.9, shipPerBottle: 1, daysMin: 2, daysMax: 4, shipsToKorea: false },
  // 이탈리아
  { key: "it-export", name: "예시 수출 리테일러 밀라노", country: "이탈리아", channel: "EXPORT_RETAILER", currency: "EUR", shipBase: 25, shipPerBottle: 8, daysMin: 8, daysMax: 13, insured: true },
  { key: "it-local", name: "예시 내수 와인숍 (이탈리아)", country: "이탈리아", channel: "LOCAL_SHOP", currency: "EUR", shipBase: 8.5, shipPerBottle: 1.2, daysMin: 2, daysMax: 5, shipsToKorea: false },
  // 뉴질랜드·호주
  { key: "nz-direct", name: "예시 와이너리 직판몰 (뉴질랜드)", country: "뉴질랜드", channel: "WINERY_DIRECT", currency: "NZD", shipBase: 55, shipPerBottle: 18, daysMin: 8, daysMax: 14, shopify: true },
  { key: "nz-export", name: "예시 수출 리테일러 오클랜드", country: "뉴질랜드", channel: "EXPORT_RETAILER", currency: "NZD", shipBase: 50, shipPerBottle: 17, daysMin: 8, daysMax: 12 },
  { key: "au-direct", name: "예시 와이너리 직판몰 (호주)", country: "호주", channel: "WINERY_DIRECT", currency: "AUD", shipBase: 48, shipPerBottle: 16, daysMin: 8, daysMax: 14 },
  { key: "au-export", name: "예시 수출 리테일러 애들레이드", country: "호주", channel: "EXPORT_RETAILER", currency: "AUD", shipBase: 45, shipPerBottle: 15, daysMin: 8, daysMax: 12, insured: true },
  { key: "au-local", name: "예시 내수 와인숍 (호주)", country: "호주", channel: "LOCAL_SHOP", currency: "AUD", shipBase: 12, shipPerBottle: 1.5, daysMin: 2, daysMax: 5, shipsToKorea: false },
  // 미국: 주별 규제로 해외 발송 와이너리가 거의 없음
  { key: "us-direct", name: "예시 와이너리 직판몰 (미국)", country: "미국", channel: "WINERY_DIRECT", currency: "USD", shipBase: 0, shipPerBottle: 0, daysMin: 7, daysMax: 14, shipsToKorea: false },
  { key: "us-export", name: "예시 수출 리테일러 뉴욕", country: "미국", channel: "EXPORT_RETAILER", currency: "USD", shipBase: 45, shipPerBottle: 15, daysMin: 7, daysMax: 12, insured: true },
  { key: "us-local", name: "예시 내수 와인숍 (미국)", country: "미국", channel: "LOCAL_SHOP", currency: "USD", shipBase: 15, shipPerBottle: 2, daysMin: 2, daysMax: 5, shipsToKorea: false },
  // 남미
  { key: "cl-direct", name: "예시 와이너리 직판몰 (칠레)", country: "칠레", channel: "WINERY_DIRECT", currency: "USD", shipBase: 40, shipPerBottle: 14, daysMin: 10, daysMax: 18 },
  { key: "cl-local", name: "예시 내수 와인숍 (칠레)", country: "칠레", channel: "LOCAL_SHOP", currency: "USD", shipBase: 8, shipPerBottle: 1, daysMin: 2, daysMax: 5, shipsToKorea: false },
  { key: "ar-direct", name: "예시 와이너리 직판몰 (아르헨티나)", country: "아르헨티나", channel: "WINERY_DIRECT", currency: "USD", shipBase: 42, shipPerBottle: 15, daysMin: 10, daysMax: 18 },
  { key: "ar-export", name: "예시 수출 리테일러 멘도사", country: "아르헨티나", channel: "EXPORT_RETAILER", currency: "USD", shipBase: 40, shipPerBottle: 14, daysMin: 10, daysMax: 16 },
  // 홍콩
  { key: "hk-1", name: "예시 홍콩 와인 리테일러 A", country: "홍콩", channel: "HK_RETAILER", currency: "HKD", shipBase: 95, shipPerBottle: 45, daysMin: 4, daysMax: 7, insured: true },
  { key: "hk-2", name: "예시 홍콩 와인 리테일러 B", country: "홍콩", channel: "HK_RETAILER", currency: "HKD", shipBase: 80, shipPerBottle: 55, daysMin: 4, daysMax: 7 },
];

const FORWARDERS = [
  { name: "예시 배송대행 (프랑스)", country: "프랑스", acceptsAlcohol: true, currency: "EUR", shipBase: 12, shipPerBottle: 13, daysMin: 10, daysMax: 20 },
  { name: "예시 배송대행 (독일)", country: "독일", acceptsAlcohol: true, currency: "EUR", shipBase: 11, shipPerBottle: 12.5, daysMin: 10, daysMax: 18 },
  { name: "예시 배송대행 (이탈리아)", country: "이탈리아", acceptsAlcohol: true, currency: "EUR", shipBase: 12, shipPerBottle: 14, daysMin: 12, daysMax: 20 },
  { name: "예시 배송대행 (미국)", country: "미국", acceptsAlcohol: false, currency: "USD", shipBase: 10, shipPerBottle: 12, daysMin: 10, daysMax: 18 },
  { name: "예시 배송대행 (칠레)", country: "칠레", acceptsAlcohol: false, currency: "USD", shipBase: 15, shipPerBottle: 14, daysMin: 12, daysMax: 20 },
  { name: "예시 배송대행 (호주)", country: "호주", acceptsAlcohol: true, currency: "AUD", shipBase: 18, shipPerBottle: 19, daysMin: 10, daysMax: 18 },
];

type WineSeed = {
  name: string;
  nameKo: string;
  producer: string;
  country: string;
  region: string;
  type: string;
  grape: string;
  vintage: number | null;
  cur: string;
  price: number; // 셀러도어가 (현지 통화)
  kr: number | null;
  direct: boolean;
  export: boolean;
  local: boolean;
  hk: boolean;
  magnum?: boolean;
  rating?: number;
  notes?: string;
};

const WINES: WineSeed[] = [
  { name: "Domaine William Fèvre Chablis 1er Cru Montmains", nameKo: "윌리엄 페브르 샤블리 프리미에 크뤼 몽맹", producer: "Domaine William Fèvre", country: "프랑스", region: "부르고뉴 · 샤블리", type: "화이트", grape: "샤르도네", vintage: 2022, cur: "EUR", price: 42, kr: 139000, direct: true, export: true, local: true, hk: true, rating: 92, notes: "굴 껍데기 같은 미네랄과 레몬 껍질, 단단한 산도. 숙성 잠재력 5~8년." },
  { name: "Domaine Faiveley Bourgogne Pinot Noir", nameKo: "페블레 부르고뉴 피노 누아", producer: "Domaine Faiveley", country: "프랑스", region: "부르고뉴", type: "레드", grape: "피노 누아", vintage: 2022, cur: "EUR", price: 24, kr: 79000, direct: true, export: true, local: true, hk: true, rating: 89, notes: "체리와 라즈베리, 가벼운 흙내음. 데일리 부르고뉴의 기준점." },
  { name: "Billecart-Salmon Brut Réserve", nameKo: "빌카르 살몽 브뤼 리저브", producer: "Billecart-Salmon", country: "프랑스", region: "샹파뉴", type: "스파클링", grape: "피노 뫼니에 · 샤르도네 · 피노 누아", vintage: null, cur: "EUR", price: 52, kr: 159000, direct: false, export: true, local: true, hk: true, magnum: true, rating: 91, notes: "청사과와 브리오슈, 섬세한 기포. 식전주로 좋습니다." },
  { name: "Pierre Péters Cuvée de Réserve Blanc de Blancs", nameKo: "피에르 페테르 퀴베 드 리저브 블랑 드 블랑", producer: "Pierre Péters", country: "프랑스", region: "샹파뉴 · 코트 데 블랑", type: "스파클링", grape: "샤르도네", vintage: null, cur: "EUR", price: 58, kr: 210000, direct: true, export: true, local: true, hk: true, rating: 93, notes: "백악질 미네랄과 시트러스, 긴 여운. 그로워 샴페인의 대표." },
  { name: "Château Lagrange Saint-Julien", nameKo: "샤토 라그랑주", producer: "Château Lagrange", country: "프랑스", region: "보르도 · 생쥘리앙", type: "레드", grape: "카베르네 소비뇽 · 메를로", vintage: 2019, cur: "EUR", price: 62, kr: 168000, direct: false, export: true, local: true, hk: true, magnum: true, rating: 93 },
  { name: "Domaine Huet Vouvray Le Haut-Lieu Sec", nameKo: "위에 부브레 르 오리외 섹", producer: "Domaine Huet", country: "프랑스", region: "루아르 · 부브레", type: "화이트", grape: "슈냉 블랑", vintage: 2022, cur: "EUR", price: 34, kr: null, direct: true, export: true, local: true, hk: false, rating: 92 },
  { name: "Keller Riesling Trocken", nameKo: "켈러 리슬링 트로켄", producer: "Weingut Keller", country: "독일", region: "라인헤센", type: "화이트", grape: "리슬링", vintage: 2023, cur: "EUR", price: 24, kr: null, direct: true, export: true, local: true, hk: false, rating: 91, notes: "복숭아와 라임, 짠맛이 도는 산도. 국내 미수입." },
  { name: "Dönnhoff Kreuznacher Krötenpfuhl Riesling GG", nameKo: "된호프 크로이츠나허 크뢰텐풀 리슬링 GG", producer: "Weingut Dönnhoff", country: "독일", region: "나헤", type: "화이트", grape: "리슬링", vintage: 2022, cur: "EUR", price: 48, kr: null, direct: false, export: true, local: true, hk: true, rating: 94 },
  { name: "Dr. Loosen Wehlener Sonnenuhr Riesling Kabinett", nameKo: "닥터 루젠 벨레너 조넨우어 리슬링 카비네트", producer: "Dr. Loosen", country: "독일", region: "모젤", type: "화이트", grape: "리슬링", vintage: 2023, cur: "EUR", price: 21, kr: 72000, direct: true, export: true, local: true, hk: true, rating: 91 },
  { name: "G.D. Vajra Barolo Albe", nameKo: "바이라 바롤로 알베", producer: "G.D. Vajra", country: "이탈리아", region: "피에몬테 · 바롤로", type: "레드", grape: "네비올로", vintage: 2020, cur: "EUR", price: 39, kr: 115000, direct: false, export: true, local: true, hk: true, rating: 92 },
  { name: "Felton Road Bannockburn Pinot Noir", nameKo: "펠튼 로드 배녹번 피노 누아", producer: "Felton Road", country: "뉴질랜드", region: "센트럴 오타고", type: "레드", grape: "피노 누아", vintage: 2023, cur: "NZD", price: 75, kr: 180000, direct: true, export: true, local: false, hk: true, rating: 93 },
  { name: "Torbreck The Struie Shiraz", nameKo: "토브렉 더 스트루이 쉬라즈", producer: "Torbreck", country: "호주", region: "바로사", type: "레드", grape: "쉬라즈", vintage: 2021, cur: "AUD", price: 55, kr: 135000, direct: true, export: true, local: true, hk: true, rating: 93 },
  { name: "Ridge Lytton Springs Zinfandel", nameKo: "릿지 리튼 스프링스 진판델", producer: "Ridge Vineyards", country: "미국", region: "소노마 · 드라이 크릭 밸리", type: "레드", grape: "진판델", vintage: 2021, cur: "USD", price: 50, kr: 150000, direct: true, export: true, local: true, hk: true, rating: 94 },
  { name: "Catena Zapata Malbec Argentino", nameKo: "카테나 자파타 말벡 아르헨티노", producer: "Catena Zapata", country: "아르헨티나", region: "멘도사", type: "레드", grape: "말벡", vintage: 2021, cur: "USD", price: 110, kr: null, direct: true, export: true, local: false, hk: true, rating: 95 },
  { name: "Errázuriz Don Maximiano Founder's Reserve", nameKo: "에라주리즈 돈 막시미아노", producer: "Viña Errázuriz", country: "칠레", region: "아콩카과 밸리", type: "레드", grape: "카베르네 소비뇽", vintage: 2021, cur: "USD", price: 95, kr: 190000, direct: true, export: false, local: true, hk: true, rating: 94 },
  { name: "Château d'Yquem", nameKo: "샤토 디켐", producer: "Château d'Yquem", country: "프랑스", region: "보르도 · 소테른", type: "디저트", grape: "세미용 · 소비뇽 블랑", vintage: 2017, cur: "EUR", price: 390, kr: 980000, direct: false, export: true, local: true, hk: true, rating: 98 },
];

const sellerKeyFor = (country: string, kind: "direct" | "export" | "local") => {
  const prefix: Record<string, string> = { 프랑스: "fr", 독일: "de", 이탈리아: "it", 뉴질랜드: "nz", 호주: "au", 미국: "us", 칠레: "cl", 아르헨티나: "ar" };
  return `${prefix[country]}-${kind}`;
};

async function main() {
  await prisma.$transaction([
    prisma.order.deleteMany(),
    prisma.clickLog.deleteMany(),
    prisma.priceAlert.deleteMany(),
    prisma.purchase.deleteMany(),
    prisma.directReview.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.crawlRun.deleteMany(),
    prisma.seller.deleteMany(),
    prisma.forwarder.deleteMany(),
    prisma.wine.deleteMany(),
  ]);

  await prisma.setting.upsert({ where: { key: "tax" }, update: { value: DEFAULT_TAX }, create: { key: "tax", value: DEFAULT_TAX } });

  const today = new Date(new Date().toISOString().slice(0, 10));
  for (const [currency, krw] of Object.entries(FX)) {
    await prisma.exchangeRate.upsert({
      where: { currency_date: { currency, date: today } },
      update: {},
      create: { currency, krw, date: today, source: "seed" },
    });
  }

  const sellerIds: Record<string, string> = {};
  for (const s of SELLERS) {
    const { key, shopify, ...data } = s;
    const row = await prisma.seller.create({
      data: { ...data, checkoutMode: shopify ? "SHOPIFY_CART" : "PRODUCT_PAGE", shipsToKorea: s.shipsToKorea ?? true, insured: s.insured ?? false, website: shopify ? `https://${key}.example.com` : `https://example.com/${key}`, affiliateTpl: "{url}?ref=wineroute&sub={clickId}" },
    });
    sellerIds[key] = row.id;
  }
  await prisma.forwarder.createMany({ data: FORWARDERS.map((f) => ({ ...f, website: "https://example.com/forwarder" })) });

  for (const w of WINES) {
    const wine = await prisma.wine.create({
      data: {
        name: w.name,
        nameKo: w.nameKo,
        producer: w.producer,
        country: w.country,
        region: w.region,
        type: w.type,
        grape: w.grape,
        vintage: w.vintage,
        aliases: [],
        krPrice: w.kr,
        krPriceSrc: w.kr ? "예시 국내 소매가" : null,
        rating: w.rating ?? null,
        ratingSrc: w.rating ? "외부 평론가 평균 (예시)" : null,
        notesKo: w.notes ?? null,
      },
    });
    const slug = w.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const offers: { key: string; price: number; ml: number }[] = [];
    const sizes = w.magnum ? [750, 1500] : [750];
    for (const ml of sizes) {
      const k = ml / 750 * (ml > 750 ? 1.08 : 1); // 매그넘은 용량 대비 약간 비쌈
      if (w.direct) offers.push({ key: sellerKeyFor(w.country, "direct"), price: w.price * k, ml });
      if (w.export) offers.push({ key: sellerKeyFor(w.country, "export"), price: w.price * 1.1 * k, ml });
      if (w.local) offers.push({ key: sellerKeyFor(w.country, "local"), price: w.price * 1.02 * k, ml });
      if (w.hk) {
        const hkd = (w.price * FX[w.cur]) / FX.HKD;
        offers.push({ key: "hk-1", price: hkd * 1.18 * k, ml });
        offers.push({ key: "hk-2", price: hkd * 1.22 * k, ml });
      }
    }
    for (const o of offers) {
      const sellerId = sellerIds[o.key];
      if (!sellerId) continue;
      await prisma.offer.create({
        data: { wineId: wine.id, sellerId, checkoutRef: SELLERS.find((x) => x.key === o.key)?.shopify ? String(40000000000 + Math.floor(Math.random() * 1e9)) : null, price: Math.round(o.price * 100) / 100, bottleMl: o.ml, url: `https://example.com/${o.key}/${slug}${o.ml !== 750 ? `-${o.ml}` : ""}` },
      });
    }
  }
  const counts = await Promise.all([prisma.wine.count(), prisma.seller.count(), prisma.offer.count()]);
  console.log(`seed 완료: 와인 ${counts[0]}, 셀러 ${counts[1]}, 판매 정보 ${counts[2]}`);
}

main().finally(() => prisma.$disconnect());
