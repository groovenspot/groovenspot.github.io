"use client";
import { startTransition, type FormEvent } from "react";

/**
 * React 19는 form action이 끝나면 입력값을 비웁니다. 검증 오류를 보여 줄 폼에서는
 * 입력값이 사라지지 않도록 onSubmit으로 직접 액션을 호출합니다.
 */
export function keepFormSubmit(dispatch: (fd: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
}
