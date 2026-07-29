import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "@/components/AuthProvider";
import { TeacherShell } from "@/components/TeacherShell";

describe("TeacherShell", () => {
  it("shows Google logout instead of the old workspace exit action", () => {
    const html = renderToStaticMarkup(
      <AuthProvider>
        <TeacherShell active="dashboard">내용</TeacherShell>
      </AuthProvider>,
    );

    expect(html).toContain(">로그아웃</button>");
    expect(html).not.toContain(">나가기</button>");
  });
});
