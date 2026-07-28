"use client";

import { getClientAuth } from "@/lib/firebase/client";

export async function apiFetch<T>(input: string, init: RequestInit = {}): Promise<T> {
  const token = await getClientAuth().currentUser?.getIdToken();
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "요청을 처리하지 못했습니다.");
  return body;
}
