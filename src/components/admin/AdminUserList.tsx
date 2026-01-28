import React, { useState, useEffect } from 'react';
import { Mail, Phone, User, Calendar, Search, ExternalLink } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  last_sign_in_at: string;
  created_at: string;
}

const AdminUserList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/list-users');
        const data = await response.json();

        if (response.ok) {
          setUsers(data.users || []);
        } else {
          setError(data.error || "Error al cargar usuarios. Asegúrate de tener configurada la SERVICE_ROLE_KEY.");
        }
      } catch (e) {
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.whatsapp?.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 p-8 rounded-[32px] text-center">
        <p className="text-red-600 font-bold mb-2">Error</p>
        <p className="text-red-500 text-sm max-w-md mx-auto">{error}</p>
        <div className="mt-6 p-4 bg-white rounded-2xl text-xs text-left font-mono">
          <p className="text-slate-500 mb-2">Pasos para corregir:</p>
          <p>1. Agrega SUPABASE_SERVICE_ROLE_KEY en tu .env</p>
          <p>2. Reinicia el servidor</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative group max-w-md">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre, email o whatsapp..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-slate-900 font-medium shadow-sm transition-all"
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div key={user.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{user.name || 'Sin nombre'}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {user.whatsapp && (
                    <a
                      href={`https://wa.me/${user.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      WhatsApp
                    </a>
                  )}
                  <div className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-medium flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Unido: {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No se encontraron usuarios que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserList;
