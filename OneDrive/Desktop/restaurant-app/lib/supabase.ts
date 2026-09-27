import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,

      // IMPORTANT:
      // Session is stored separately for each browser tab.
      // Customer / Admin / Delivery sessions will no longer
      // automatically sync through shared localStorage.
      storage:
        typeof window !== "undefined"
          ? window.sessionStorage
          : undefined,
    },
  }
);