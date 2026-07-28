import type { Timestamp } from "firebase-admin/firestore";
import type { ClassBudget, Product, ResponseItem } from "@/lib/types";

export type RoomDocument = {
  ownerUid: string;
  name: string;
  normalizedName: string;
  createdAt: Timestamp;
};

export type SurveyDocument = {
  title: string;
  classBudgets: ClassBudget[];
  products: Product[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ResponseDocument = {
  submitterUid: string;
  grade: number;
  classNumber: number;
  studentNumber: number;
  studentName: string;
  items: ResponseItem[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type ReservationDocument = {
  submitterUid: string;
  grade: number;
  classNumber: number;
  studentName: string;
  assignments: Record<string, string>;
  expiresAt: Timestamp;
  consumedAt: Timestamp | null;
};
