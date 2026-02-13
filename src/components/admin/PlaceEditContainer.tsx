import React, { useEffect, useState } from "react";
import ContentEditor from "./ContentEditor";
import { formater } from "../../types/app";

interface PlaceData {
  place: any;
  reviews: any[];
  isAdmin: boolean;
}

function getTypeSlug(type: unknown) {
  if (type === "motel" || type === "restaurant") return formater[type];
  return "menus";
}

function getPublicPath(place: any) {
  if (place?.type === "motel" && place?.states?.slug) {
    return `/moteles/estados/${place.states.slug}/${place.short_name}`;
  }

  const typeSlug = getTypeSlug(place?.type);
  return `/${typeSlug}/${place?.short_name}`;
}

export default function PlaceEditContainer({ placeId, initialTab = "editor" }: { placeId: string; initialTab?: "info" | "editor" | "preview" | "media" }) {
  const [data, setData] = useState<PlaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/admin/place/${placeId}`);
        if (response.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (!response.ok) {
          throw new Error("Error al cargar los datos del establecimiento");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        setError(err?.message || "Error al cargar los datos del establecimiento");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [placeId]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 animate-pulse">
        <div className="mb-6">
          <div className="h-4 w-24 bg-gray-100 rounded mb-4"></div>
          <div className="h-8 w-64 bg-gray-100 rounded"></div>
        </div>
        <div className="h-[600px] bg-gray-100 rounded-xl"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-red-600 m-8">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error || "No se pudo cargar la información"}</p>
        <a href="/admin/dashboard" className="mt-4 inline-block text-sm font-bold underline">
          Volver al Dashboard
        </a>
      </div>
    );
  }

  const { place } = data;

  return (
    <div className="xl:p-4 lg:p-8">
      <div>
        <ContentEditor
          placeId={place.id}
          initialContent={place.content}
          placeType={place.type}
          placeData={place}
          initialTab={initialTab}
        />
      </div>
    </div>
  );
}
