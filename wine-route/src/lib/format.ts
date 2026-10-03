export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
export const num = (n: number, d = 0) => n.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const money = (n: number, cur: string) => `${cur} ${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
export const pct = (r: number) => `${(r * 100).toFixed(1)}%`;
export const ymd = (d: Date) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
export const sizeLabel = (ml: number) => (ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`);
export const ymdhm = (d: Date) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 16).replace("T", " ");
export const FX_SOURCE_LABEL: Record<string, string> = { ecb: "유럽중앙은행(ECB) 기준환율", erapi: "ExchangeRate-API", investing: "investing.com", koreaexim: "한국수출입은행", manual: "직접 입력", seed: "예시값" };
