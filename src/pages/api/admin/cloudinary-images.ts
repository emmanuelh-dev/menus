export const prerender = false;

import type { APIRoute } from "astro";
import { createAuthenticatedClient } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

interface CloudinaryResource {
  asset_id: string;
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

interface CloudinarySearchResponse {
  resources?: CloudinaryResource[];
}

const getPublicIdFromCloudinaryUrl = (imageUrl: string) => {
  try {
    const parsed = new URL(imageUrl);
    const marker = '/image/upload/';
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const afterUpload = parsed.pathname.slice(markerIndex + marker.length);
    const segments = afterUpload.split('/').filter(Boolean);
    const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
    const publicIdSegments = versionIndex >= 0 ? segments.slice(versionIndex + 1) : segments;

    if (publicIdSegments.length === 0) return null;

    const joined = publicIdSegments.join('/');
    return joined.replace(/\.[a-zA-Z0-9]+$/, '');
  } catch {
    return null;
  }
};

const getCloudinaryCredentials = () => {
  const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = import.meta.env.CLOUDINARY_API_KEY;
  const apiSecret = import.meta.env.CLOUDINARY_API_SECRET;

  return { cloudName, apiKey, apiSecret };
};

const createCloudinaryAuth = (apiKey: string, apiSecret: string) => Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const supabaseUser = await createAuthenticatedClient(accessToken, refreshToken);
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!isAdmin(user?.email)) {
      return new Response(JSON.stringify({ error: "Prohibido" }), { status: 403 });
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();

    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          error: "Faltan variables de Cloudinary (PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
        }),
        { status: 500 },
      );
    }

    const auth = createCloudinaryAuth(apiKey, apiSecret);

    const searchResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expression: "resource_type:image",
        max_results: 100,
        sort_by: [{ created_at: "desc" }],
      }),
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      return new Response(
        JSON.stringify({ error: `Error consultando Cloudinary: ${errorText}` }),
        { status: 500 },
      );
    }

    const data = (await searchResponse.json()) as CloudinarySearchResponse;

    return new Response(JSON.stringify({ images: data.resources || [] }), { status: 200 });
  } catch (error) {
    console.error("Cloudinary admin list error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ cookies, request }) => {
  try {
    const accessToken = cookies.get("sb-access-token")?.value;
    const refreshToken = cookies.get("sb-refresh-token")?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
    }

    const supabaseUser = await createAuthenticatedClient(accessToken, refreshToken);
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!isAdmin(user?.email)) {
      return new Response(JSON.stringify({ error: "Prohibido" }), { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const publicIdFromBody = typeof body.publicId === 'string' ? body.publicId : null;
    const imageUrlFromBody = typeof body.imageUrl === 'string' ? body.imageUrl : null;
    const publicId = publicIdFromBody || (imageUrlFromBody ? getPublicIdFromCloudinaryUrl(imageUrlFromBody) : null);

    if (!publicId) {
      return new Response(JSON.stringify({ error: "publicId o imageUrl son requeridos" }), { status: 400 });
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
    if (!cloudName || !apiKey || !apiSecret) {
      return new Response(
        JSON.stringify({
          error: "Faltan variables de Cloudinary (PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)",
        }),
        { status: 500 },
      );
    }

    const auth = createCloudinaryAuth(apiKey, apiSecret);
    const destroyResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_id: publicId,
        invalidate: true,
      }),
    });

    if (!destroyResponse.ok) {
      const errorText = await destroyResponse.text();
      return new Response(JSON.stringify({ error: `Error eliminando imagen: ${errorText}` }), { status: 500 });
    }

    const result = await destroyResponse.json();
    if (result.result !== 'ok' && result.result !== 'not found') {
      return new Response(JSON.stringify({ error: `No se pudo eliminar la imagen (${result.result})` }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, result: result.result, publicId }), { status: 200 });
  } catch (error) {
    console.error("Cloudinary admin delete error:", error);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
};