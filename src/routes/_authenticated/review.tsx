// src/routes/_authenticated/review.tsx
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const [tab, setTab] = useState("pending"); // pending | approved | rejected

  return (
    <AppShell title="Review Queue" description="Admin review of submitted audit records.">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Admin Review Queue</h2>
        {/* Tabs */}
        <div className="flex gap-4 mb-4">
          {[
            { id: "pending", label: "Pending Review" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Returned / Reopened" },
          ].map((t) => (
            <button
              key={t.id}
              className={`px-4 py-2 rounded ${tab === t.id ? "bg-brand text-primary-foreground" : "bg-card text-muted-foreground hover:bg-brand/10"}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {/* Placeholder list */}
        <div className="border rounded p-4 bg-card text-muted-foreground">
          <p>{tab.charAt(0).toUpperCase() + tab.slice(1)} items will appear here.</p>
        </div>
      </div>
    </AppShell>
  );
}
