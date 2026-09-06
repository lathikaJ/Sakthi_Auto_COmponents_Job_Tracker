import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const employeeInput = z.object({ employeeNumber: z.string().trim().min(1).max(32) });
const verifyInput = employeeInput.extend({ code: z.string().trim().regex(/^\d{6}$/) });

function emailFor(employeeNumber: string) {
  return `emp${employeeNumber.toLowerCase()}@sakthispark.local`;
}

export const requestLoginCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => employeeInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const employeeNumber = data.employeeNumber.trim();

    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("*")
      .eq("employee_number", employeeNumber)
      .eq("active", true)
      .maybeSingle();

    if (!employee) {
      throw new Error("Employee number not found. Please contact the audit administrator.");
    }

    const email = emailFor(employeeNumber);

    // Ensure an auth identity exists for this employee number.
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { employee_number: employeeNumber, full_name: employee.full_name },
    });

    let userId = created.data.user?.id ?? null;
    if (!userId) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      userId = list?.users.find((u) => u.email === email)?.id ?? null;
    }
    if (!userId) throw new Error("Unable to prepare sign-in for this employee number.");

    await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        employee_number: employeeNumber,
        full_name: employee.full_name,
        department: employee.department,
        designation: employee.designation,
      },
      { onConflict: "id" },
    );

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: employee.role }, { onConflict: "user_id,role" });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await supabaseAdmin.from("login_codes").insert({
      employee_number: employeeNumber,
      code,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    // No SMS gateway is configured, so the code is surfaced in-app for verification.
    return { ok: true as const, fullName: employee.full_name, code };
  });

export const verifyLoginCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => verifyInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const employeeNumber = data.employeeNumber.trim();

    const { data: row } = await supabaseAdmin
      .from("login_codes")
      .select("*")
      .eq("employee_number", employeeNumber)
      .eq("code", data.code)
      .eq("consumed", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("Invalid or expired OTP. Please request a new code.");

    await supabaseAdmin.from("login_codes").update({ consumed: true }).eq("id", row.id);

    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: emailFor(employeeNumber),
    });
    if (error || !link?.properties?.hashed_token) {
      throw new Error("Could not establish a session. Please try again.");
    }

    return { tokenHash: link.properties.hashed_token };
  });
