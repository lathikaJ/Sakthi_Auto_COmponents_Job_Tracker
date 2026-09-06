import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { SakthiLogo } from "@/components/brand/SakthiLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestLoginCode, verifyLoginCode } from "@/lib/auth.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign In — Sakthi Spark Audit Platform" },
      {
        name: "description",
        content:
          "Sign in with your Sakthi Auto employee number to access audit plans, assignments and deviation reporting.",
      },
      { property: "og:title", content: "Sign In — Sakthi Spark Audit Platform" },
      {
        property: "og:description",
        content: "Employee sign-in for the Sakthi Spark continuous improvement platform.",
      },
    ],
  }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const sendCode = useServerFn(requestLoginCode);
  const verifyCode = useServerFn(verifyLoginCode);

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"id" | "otp">("id");
  const [busy, setBusy] = useState(false);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeNumber.trim()) return;
    setBusy(true);
    try {
      const res = await sendCode({ data: { employeeNumber: employeeNumber.trim() } });
      setStep("otp");
      toast.success(`OTP generated for ${res.fullName}`, {
        description: `No SMS gateway is connected, so your code is: ${res.code}`,
        duration: 15000,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send OTP.");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { tokenHash } = await verifyCode({
        data: { employeeNumber: employeeNumber.trim(), code: code.trim() },
      });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
      if (error) throw new Error(error.message);
      await navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not verify OTP.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="surface-shell flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <div className="rounded-2xl bg-card p-5 shadow-lift">
            <SakthiLogo />
          </div>
          <p className="mt-5 text-center text-lg font-medium text-slate-deep-foreground">
            Continuous Improvement Platform
          </p>
        </div>

        <div className="card-elevated mt-8 p-6">
          <h1 className="text-center text-3xl font-semibold text-brand">Sign In</h1>

          {step === "id" ? (
            <form className="mt-6 space-y-4" onSubmit={handleSend}>
              <div className="space-y-2">
                <Label htmlFor="employeeNumber" className="sr-only">
                  Employee Number
                </Label>
                <Input
                  id="employeeNumber"
                  placeholder="Employee Number"
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength={32}
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
                {busy ? "Sending…" : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleVerify}>
              <p className="text-center text-sm text-muted-foreground">
                Enter the 6-digit OTP issued for employee {employeeNumber}.
              </p>
              <Input
                id="otp"
                placeholder="6-digit OTP"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="h-12 text-center text-lg tracking-[0.4em]"
              />
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full text-base"
                disabled={busy || code.length !== 6}
              >
                {busy ? "Verifying…" : "Verify & Continue"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("id");
                  setCode("");
                }}
              >
                Use a different employee number
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-deep-foreground/70">
          Demo roster — Admin: 1001 · Employees: 1002, 1003, 1004, 1005
        </p>
      </div>
    </div>
  );
}
