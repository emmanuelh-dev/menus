import React, { useState, useEffect } from "react";
import { User as UserIcon, Mail, Phone, Save, ArrowLeft } from "lucide-react";

export default function ProfileContainer() {
  const [profile, setProfile] = useState({
    name: "",
    whatsapp: "",
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.user) {
          setProfile({
            name: data.user.user_metadata?.name || "",
            whatsapp: data.user.user_metadata?.whatsapp || "",
            email: data.user.email || "",
          });
        } else {
          window.location.href = "/admin/login";
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/auth/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          whatsapp: profile.whatsapp,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({
          type: "success",
          message: "✓ Perfil actualizado con éxito",
        });
        setTimeout(() => setStatus(null), 3000);
      } else {
        throw new Error(data.error || "Error al actualizar");
      }
    } catch (error: any) {
      setStatus({ type: "error", message: "✕ " + error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse">
        <div className="h-[400px] bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 md:p-10">
        {status && (
          <div
            className={`p-4 rounded-xl mb-8 text-center text-xs font-black uppercase tracking-widest ${status.type === "success"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
              }`}
          >
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-[10px] font-black uppercase text-slate-400 ml-1"
            >
              Correo Electrónico
            </label>
            <div className="relative group opacity-50">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                id="email"
                value={profile.email}
                disabled
                className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-slate-600 text-sm font-medium cursor-not-allowed"
              />
            </div>
            <p className="text-[9px] text-slate-400 ml-1 font-medium italic">
              No se puede modificar por seguridad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="block text-[10px] font-black uppercase text-slate-400 ml-1"
              >
                Nombre Completo
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-black transition-colors">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={profile.name}
                  onChange={(e) =>
                    setProfile({ ...profile, name: e.target.value })
                  }
                  required
                  placeholder="Tu nombre"
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:ring-1 focus:ring-black transition-all outline-none text-slate-900 text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="whatsapp"
                className="block text-[10px] font-black uppercase text-slate-400 ml-1"
              >
                WhatsApp / Teléfono
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-black transition-colors">
                  <Phone className="h-4 w-4" />
                </div>
                <input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  value={profile.whatsapp}
                  onChange={(e) =>
                    setProfile({ ...profile, whatsapp: e.target.value })
                  }
                  required
                  placeholder="+52 ..."
                  className="block w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-black focus:ring-1 focus:ring-black transition-all outline-none text-slate-900 text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full flex justify-center items-center py-4 px-6 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all duration-300  shadow-slate-900/10 group active:scale-[0.98] uppercase text-xs tracking-widest disabled:opacity-50"
            >
              <Save className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
