import type { ReactNode } from "react";
import { PlatformShell } from "./_components/PlatformShell";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>;
}
