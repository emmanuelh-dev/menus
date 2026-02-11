export const prerender = false;

import type { APIRoute } from "astro";
import { supabase } from "../../../lib/supabase";

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (accessToken && refreshToken) {
      await supabase.auth.signOut();
    }

    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    cookies.delete("sb-magic-token", { path: "/" });
    cookies.delete("sb-impersonate-id", { path: "/" });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    cookies.delete("sb-magic-token", { path: "/" });
    cookies.delete("sb-impersonate-id", { path: "/" });
    
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  }
};
