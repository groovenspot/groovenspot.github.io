"use client";

import { useEffect, useId, useRef, useState } from "react";

export type EnglishAddress = { address1En: string; cityEn: string; provinceEn: string; zip: string };

function isAddress(value: unknown): value is EnglishAddress {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return ["address1En", "cityEn", "provinceEn", "zip"].every((key) => typeof row[key] === "string")
    && /^\d{5}$/.test(String(row.zip));
}

export function AddressSearch({ onSelect }: { onSelect: (value: EnglishAddress) => void }) {
  const id = useId();
  const [keyword, setKeyword] = useState("");
  const [pending, setPending] = useState(false);
  const [addresses, setAddresses] = useState<EnglishAddress[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const request = useRef<AbortController | null>(null);

  useEffect(() => () => request.current?.abort(), []);

  async function search() {
    if (pending) return;
    const term = keyword.trim();
    setAddresses([]);
    setTotal(0);
    setSelected(null);
    if (term.length < 2 || term.length > 120) {
      setMessage("한글 도로명이나 건물명 등 주소 검색어를 2~120자로 입력해 주세요.");
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setMessage("영문 주소를 검색하고 있습니다.");
    try {
      const response = await fetch("/guide/first/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: term }),
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      const data: unknown = await response.json();
      if (!data || typeof data !== "object") throw new Error("invalid response");
      const result = data as Record<string, unknown>;
      if (!response.ok) {
        setMessage(typeof result.message === "string" ? result.message : "주소 검색에 실패했습니다. 영문 주소를 직접 입력할 수 있습니다.");
        return;
      }
      if (typeof result.configured !== "boolean" || !Array.isArray(result.addresses)
        || !result.addresses.every(isAddress) || typeof result.total !== "number"
        || !Number.isInteger(result.total) || result.total < 0) throw new Error("invalid response");
      setAddresses(result.addresses);
      setTotal(result.total);
      setMessage(typeof result.message === "string" ? result.message : `${result.total}개 주소를 찾았습니다. 내 주소를 선택해 주세요.`);
    } catch {
      if (!controller.signal.aborted) setMessage("주소 검색에 연결하지 못했습니다. 잠시 후 다시 검색하거나 영문 주소를 직접 입력해 주세요.");
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <section className="stack" aria-label="한글 주소로 영문 주소 찾기">
      <div className="field">
        <label className="label" htmlFor={`${id}-keyword`}>한글 주소 검색</label>
        <div className="row">
          <input id={`${id}-keyword`} value={keyword} disabled={pending} maxLength={120}
            placeholder="예: 테헤란로 152" autoComplete="off" aria-describedby={`${id}-help`}
            onChange={(event) => { setKeyword(event.target.value); setAddresses([]); setSelected(null); setMessage(""); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
          <button type="button" className="btn ghost" disabled={pending} onClick={() => void search()}>{pending ? "검색 중…" : "영문 주소 찾기"}</button>
        </div>
      </div>
      <p id={`${id}-help`} className="small muted">도로명과 건물번호로 검색해 주세요. 동·호수는 주소 2에 직접 입력합니다.</p>
      <p className="small" role="status" aria-live="polite">{message}</p>
      {addresses.length > 0 && (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-label="영문 주소 검색 결과">
          {addresses.map((address, index) => (
            <li key={`${address.zip}-${address.address1En}-${index}`} className="box">
              <p className="small" style={{ marginTop: 0 }}>{address.address1En}<br /><span className="muted">우편번호 {address.zip}</span></p>
              <button type="button" className="btn ghost small" aria-pressed={selected === index}
                onClick={() => { onSelect(address); setSelected(index); setMessage("영문 주소를 적용했습니다. 동·호수와 주소 입력값을 확인한 뒤 저장해 주세요."); }}>
                {selected === index ? "선택됨" : "이 주소 사용"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {total > 10 && addresses.length > 0 && <p className="small muted">검색 결과 중 첫 10개를 보여줍니다. 건물번호를 더해 검색하면 내 주소를 찾기 쉽습니다.</p>}
      <p className="small muted">
        <a href="https://www.juso.go.kr/openIndexPage.do" target="_blank" rel="noopener noreferrer">도로명주소 안내시스템에서 영문 주소 확인 ↗</a>
        {" · "}아래 영문 주소 입력칸에 직접 입력해도 됩니다.
      </p>
    </section>
  );
}
