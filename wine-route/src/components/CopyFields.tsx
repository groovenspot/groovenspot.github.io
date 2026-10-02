"use client";
import { useState } from "react";

/** 판매처 주문서에 붙여넣을 값들. 각 줄에 복사 버튼. */
export function CopyFields({ rows }: { rows: { label: string; value: string; hint?: string }[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    } catch {
      const el = document.getElementById(`cf-${label}`);
      if (el) window.getSelection()?.selectAllChildren(el);
    }
  };
  return (
    <div className="table-wrap">
      <table className="data">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="small muted" style={{ width: "34%" }}>{r.label}{r.hint && <span className="formula">{r.hint}</span>}</td>
              <td><span id={`cf-${r.label}`} className="num" style={{ userSelect: "all", wordBreak: "break-all" }}>{r.value || "—"}</span></td>
              <td className="r">
                {r.value && (
                  <button type="button" className="btn ghost small" onClick={() => copy(r.label, r.value)}>
                    {copied === r.label ? "복사됨" : "복사"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
