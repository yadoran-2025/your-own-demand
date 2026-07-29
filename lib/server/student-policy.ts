export function requireEligibleAge(ageConfirmed: unknown): asserts ageConfirmed is true {
  if (ageConfirmed !== true) {
    throw new Error("만 14세 미만은 이 서비스를 이용할 수 없습니다.");
  }
}
