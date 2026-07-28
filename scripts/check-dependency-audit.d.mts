export type AuditAdvisory = {
  severity: string;
  url: string;
};

export type AuditReport = {
  vulnerabilities?: Record<string, {
    via?: Array<string | AuditAdvisory>;
  }>;
};

export type AuditBaseline = {
  advisories: AuditAdvisory[];
};

export function collectAdvisories(report: AuditReport): AuditAdvisory[];
export function compareAudit(
  report: AuditReport,
  baseline: AuditBaseline,
): {
  accepted: string[];
  critical: string[];
  introduced: string[];
  ok: boolean;
};
