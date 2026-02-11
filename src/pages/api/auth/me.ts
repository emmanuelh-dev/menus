export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";

export const GET: APIRoute = async ({ cookies, request }) => {
  try {
    const { getEffectiveUser } = await import("../../../middleware/auth");
    const result = await getEffectiveUser(request, cookies);

    if (!result) {
      return new Response(JSON.stringify({ user: null }), { status: 200 });
    }

    const { realUser, effectiveUser, isAdmin } = result;
    const isMagic = !!cookies.get('sb-magic-token')?.value;

    return new Response(JSON.stringify({ 
      user: realUser, 
      isAdmin,
      isMagic,
      impersonating: effectiveUser.id !== realUser.id ? effectiveUser : null
    }), { status: 200 });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return new Response(JSON.stringify({ user: null }), { status: 200 });
  }
};
