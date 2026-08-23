import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { SubmittedAuditsRegister } from "@/components/admin/SubmittedAuditsRegister";
import { ElectronicSignatureRegistry } from "@/components/admin/ElectronicSignatureRegistry";

export const Route = createFileRoute("/_authenticated/review")({
  component: ReviewPage,
});

function ReviewPage() {
  return (
    <AppShell
      title="Admin Review Queue & E-Signature Registry"
      description="Track submitted audit records, verify employee signatures, and manage 10-member electronic signatures."
    >
      <div className="space-y-6">
        <SubmittedAuditsRegister />
        <ElectronicSignatureRegistry />
      </div>
    </AppShell>
  );
}
