import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const jsonOk = <T>(body: T, status = 200) => NextResponse.json(body, { status });

export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  const status = error instanceof HttpError ? error.status
    : message.includes("권한") || message.includes("다른 교사") ? 403
    : message.includes("찾지 못") ? 404
    : 400;
  return NextResponse.json({ error: message }, { status });
}
