import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data?.user) return { user: data.user };

    if (typeof window !== "undefined") {
      const demoSession = localStorage.getItem("sakthi_demo_session");
      if (demoSession) {
        try {
          const parsed = JSON.parse(demoSession);
          if (parsed?.employeeNumber) {
            return {
              user: {
                id: parsed.employeeNumber,
                email: `emp${parsed.employeeNumber}@sakthispark.local`,
              },
            };
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
