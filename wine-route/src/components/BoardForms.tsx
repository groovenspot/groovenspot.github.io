"use client";
import { useActionState, useRef, useEffect } from "react";
import { keepFormSubmit } from "@/components/useKeepForm";
import { createComment, createPost } from "@/app/community/board/actions";
import { BOARD_CATEGORIES, BOARD_LIMITS } from "@/lib/community";

export function PostForm({ wines, defaultWine }: { wines: { id: string; label: string }[]; defaultWine?: string }) {
  const [state, action, pending] = useActionState(createPost, {});
  return (
    <form onSubmit={keepFormSubmit(action)} className="box stack">
      {state.error && <div className="alert bad" role="alert">{state.error}</div>}
      <div className="form-grid">
        <div className="field">
          <label className="label" htmlFor="b-cat">말머리</label>
          <select id="b-cat" name="category" defaultValue="free">
            {Object.entries(BOARD_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="b-wine">관련 와인 (선택)</label>
          <select id="b-wine" name="wineId" defaultValue={defaultWine ?? ""}>
            <option value="">없음</option>
            {wines.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field">
        <label className="label" htmlFor="b-title">제목</label>
        <input id="b-title" name="title" required minLength={BOARD_LIMITS.title[0]} maxLength={BOARD_LIMITS.title[1]} />
      </div>
      <div className="field">
        <label className="label" htmlFor="b-body">본문</label>
        <textarea id="b-body" name="body" required minLength={BOARD_LIMITS.body[0]} maxLength={BOARD_LIMITS.body[1]} style={{ minHeight: 220 }} />
      </div>
      <p className="small muted">개인 간 거래·나눔, 공동구매 모집, 연락처 교환, 음주 권장은 금지입니다. 협찬을 받았다면 본문에 밝혀 주세요.</p>
      <div><button className="btn" disabled={pending}>{pending ? "올리는 중…" : "올리기"}</button></div>
    </form>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const [state, action, pending] = useActionState(createComment, {});
  const ref = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);
  // 성공하면 입력란만 비웁니다 (오류일 때는 그대로 둠).
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) ref.current?.reset();
    wasPending.current = pending;
  }, [pending, state]);
  return (
    <form ref={ref} onSubmit={keepFormSubmit(action)} className="stack" style={{ gap: 6 }}>
      <input type="hidden" name="postId" value={postId} />
      <label className="label" htmlFor="c-body">댓글</label>
      <textarea id="c-body" name="body" required maxLength={BOARD_LIMITS.comment[1]} style={{ minHeight: 80 }} />
      {state.error && <span className="small neg" role="alert">{state.error}</span>}
      <div><button className="btn small" disabled={pending}>댓글 달기</button></div>
    </form>
  );
}
