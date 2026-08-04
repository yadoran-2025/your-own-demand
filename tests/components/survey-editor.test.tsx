import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createNextClassBudget, SurveyEditor } from "@/components/SurveyEditor";
import { createDefaultDraft } from "@/lib/data";

describe("SurveyEditor", () => {
  it("unlocks survey fields only after a class budget is configured", () => {
    const draft = createDefaultDraft();
    const locked = renderToStaticMarkup(
      <SurveyEditor initialDraft={{ ...draft, id: "survey-1" }} onSave={async () => {}} />,
    );
    const unlocked = renderToStaticMarkup(
      <SurveyEditor
        initialDraft={{
          ...draft,
          id: "survey-1",
          classBudgets: [{ grade: 3, class_number: 1, budget: 20_000 }],
        }}
        onSave={async () => {}}
      />,
    );

    expect(locked).toContain('class="survey-details-fields" disabled=""');
    expect(unlocked).not.toContain('class="survey-details-fields" disabled=""');
  });

  it("starts a new survey with the budget step and hides later fields", () => {
    const html = renderToStaticMarkup(<SurveyEditor onSave={async () => {}} />);

    expect(html).toContain("1단계. 학급별 예산");
    expect(html).toContain("등록된 학급별 예산이 없습니다.");
    expect(html).not.toContain("설문 제목");
  });

  it("increments the class number when adding a budget", () => {
    expect(createNextClassBudget([{ grade: 3, class_number: 1, budget: 20_000 }])).toEqual({
      grade: 3,
      class_number: 2,
      budget: 20_000,
    });
  });
});
