"use client";

import { getClientAuth } from "@/lib/firebase/client";

export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const user = getClientAuth().currentUser;
  if (!user) throw new Error("로그인이 필요합니다.");
  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(input, {
    ...init,
    headers,
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
  return body;
}
