export type PricePoint = {
  id: string;
  product_id: string;
  description: string;
  price: number;
  sort_order: number;
};

export type Product = {
  id: string;
  survey_id: string;
  name: string;
  sort_order: number;
  price_points: PricePoint[];
};

export type Survey = {
  id: string;
  title: string;
  teacher_pin?: string | null;
  created_at: string;
  class_budgets: ClassBudget[];
  products: Product[];
};

export type ClassBudget = {
  grade: number;
  class_number: number;
  budget: number;
};

export type StudentProfile = {
  grade: number;
  class_number: number;
  student_number: number;
  student_name: string;
};

export type ResponseItem = {
  id: string;
  response_id: string;
  product_id: string;
  price_point_id: string;
  quantity: number;
};

export type StudentResponse = StudentProfile & {
  id: string;
  survey_id: string;
  created_at: string;
  response_items: ResponseItem[];
};

export type SurveyDraft = {
  id?: string;
  title: string;
  classBudgets: ClassBudget[];
  products: Array<{
    id?: string;
    name: string;
    pricePoints: Array<{
      description: string;
      price: number;
    }>;
  }>;
};

export type QuantityMap = Record<string, number>;

export type FilterState = {
  grade: string;
  classNumber: string;
};

export type DemandScope = "class" | "school";

export type DistributionBin = {
  label: string;
  count: number;
};

export type DemandRespondent = {
  grade: number;
  classNumber: number;
  studentName: string;
  quantity: number;
};

export type DemandPoint = {
  price: number;
  pricePointId: string;
  classAverage: number;
  overallAverage: number;
  classCount: number;
  overallCount: number;
  classDistribution: DistributionBin[];
  overallDistribution: DistributionBin[];
  classRespondents: DemandRespondent[];
  overallRespondents: DemandRespondent[];
};
