import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "ناقص إعدادات Supabase. تأكد إنك ضفت VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY بملف .env (محليًا) أو بإعدادات Environment Variables على Vercel."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
