import React, { useState, useEffect } from 'react';
import { Mail, Phone, User, Calendar, Search, ExternalLink, Utensils, Clock } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  whatsapp: string;
  business_name: string;
  last_sign_in_at: string;
  created_at: string;
  places: string[];
}

const AdminUserList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openMessageId, setOpenMessageId] = useState<string | null>(null);
  const [whatsappPlatform, setWhatsappPlatform] = useState<'normal' | 'web'>('normal');
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with' | 'without'>('all');
  const [placeFilter, setPlaceFilter] = useState<'all' | 'with' | 'without'>('all');
  const [loginFilter, setLoginFilter] = useState<'all' | 'today' | '3days' | 'week' | 'never'>('all');

  useEffect(() => {
    // ... (rest of fetch remains the same)
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

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.whatsapp?.includes(searchTerm) ||
      user.places?.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter by Phone
    const matchesPhone = phoneFilter === 'all' ||
      (phoneFilter === 'with' && !!user.whatsapp) ||
      (phoneFilter === 'without' && !user.whatsapp);

    // Filter by Place
    const matchesPlace = placeFilter === 'all' ||
      (placeFilter === 'with' && user.places?.length > 0) ||
      (placeFilter === 'without' && (!user.places || user.places.length === 0));

    // Filter by Login
    let matchesLogin = true;
    if (loginFilter !== 'all') {
      if (!user.last_sign_in_at) {
        matchesLogin = loginFilter === 'never';
      } else {
        const lastLogin = new Date(user.last_sign_in_at).getTime();
        const now = new Date().getTime();
        const diffDays = (now - lastLogin) / (1000 * 60 * 60 * 24);

        if (loginFilter === 'today') matchesLogin = diffDays <= 1;
        else if (loginFilter === '3days') matchesLogin = diffDays <= 3;
        else if (loginFilter === 'week') matchesLogin = diffDays <= 7;
        else if (loginFilter === 'never') matchesLogin = false;
      }
    }

    return matchesSearch && matchesPhone && matchesPlace && matchesLogin;
  });

  const getWhatsAppLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (whatsappPlatform === 'web') {
      return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    }
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const getMessageTemplates = (user: UserProfile) => {
    const firstName = user.name?.split(' ')[0] || 'hola';
    const business = user.business_name || (user.places && user.places[0]) || 'tu negocio';

    return [
      {
        id: 'support',
        label: 'Soporte Directo',
        text: `Hola ${firstName}, gracias por registrarte en Menús BysMax. Vi que registraste ${business}. ¿Cómo vas con tu menú digital? Si tienes alguna duda o problema en el proceso, estamos aquí para ayudarte.`
      },
      {
        id: 'friendly',
        label: 'Saludo Amigable',
        text: `¡Hola ${firstName}! Qué gusto que te hayas unido a nuestra comunidad. Soy Emmanuel de BysMax. ¿Ya pudiste subir tus platillos a ${business}? Cualquier cosa que necesites para configurar tu menú, dime con confianza.`
      },
      {
        id: 'offer',
        label: 'Ofrecer Ayuda',
        text: `Hola ${firstName}, bienvenido. Noté que ya creaste tu cuenta para ${business}. Queremos asegurar que tengas la mejor experiencia. ¿Te gustaría que te ayudemos a optimizar tu menú digital?`
      },
      {
        id: 'no-business',
        label: 'Sin Negocio / Incompleto',
        text: `Hola ${firstName}, vimos que te creaste una cuenta en Menús BysMax, pero aún no registraste tu menú. ¿Necesitas ayuda para comenzar o tienes alguna duda con el proceso? Estamos aquí para apoyarte.`
      }
    ];
  };

  const formatRelativeTime = (dateString: string) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'hace un momento';
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`;

    const diffInDays = Math.floor(diffInSeconds / 86400);
    if (diffInDays === 1) return 'ayer';
    if (diffInDays < 7) return `hace ${diffInDays} días`;

    return date.toLocaleDateString();
  };

  if (loading) return null;

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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative group max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-emerald-500 transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, email, whatsapp o establecimientos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-slate-900 font-medium shadow-sm transition-all"
            />
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setWhatsappPlatform('normal')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${whatsappPlatform === 'normal'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <Phone className="w-3.5 h-3.5" />
              WhatsApp App
            </button>
            <button
              onClick={() => setWhatsappPlatform('web')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${whatsappPlatform === 'web'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
                }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              WhatsApp Web
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">WhatsApp:</div>
            <div className="flex bg-slate-200/50 p-1 rounded-2xl shadow-inner">
              <button
                onClick={() => setPhoneFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${phoneFilter === 'all'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPhoneFilter('with')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${phoneFilter === 'with'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Con
              </button>
              <button
                onClick={() => setPhoneFilter('without')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${phoneFilter === 'without'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Sin
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Negocio:</div>
            <div className="flex bg-slate-200/50 p-1 rounded-2xl shadow-inner">
              <button
                onClick={() => setPlaceFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${placeFilter === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPlaceFilter('with')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${placeFilter === 'with'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Con
              </button>
              <button
                onClick={() => setPlaceFilter('without')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${placeFilter === 'without'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Sin
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Última Actividad:</div>
            <div className="flex bg-slate-200/50 p-1 rounded-2xl shadow-inner">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'today', label: 'Hoy' },
                { id: '3days', label: '3 d' },
                { id: 'week', label: '7 d' },
                { id: 'never', label: 'Nunca' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setLoginFilter(opt.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${loginFilter === opt.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 invisible">Meta:</div>
            <div className="text-xs font-medium text-slate-400 bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
              Usuarios: <span className="text-slate-900 font-bold">{filteredUsers.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative ${openMessageId === user.id ? 'z-50' : 'z-0'}`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors shrink-0">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <h3 className="font-bold text-slate-900 flex flex-wrap items-center gap-2">
                        {user.name || 'Sin nombre'}
                        {user.business_name && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                            {user.business_name}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1 leading-none"><Mail className="w-3.5 h-3.5" /> {user.email}</span>
                      </div>
                    </div>

                    {user.places && user.places.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {user.places.map((place, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 bg-slate-50 text-slate-600 text-[10px] font-semibold rounded-lg border border-slate-100">
                            <Utensils className="w-3 h-3 mr-1 opacity-50" />
                            {place}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:self-center">
                  <div className="relative">
                    <button
                      onClick={() => setOpenMessageId(openMessageId === user.id ? null : user.id)}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95"
                    >
                      <Phone className="w-4 h-4" />
                      Seguimiento
                    </button>

                    {openMessageId === user.id && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Opciones de mensaje
                        </div>
                        <div className="p-2 space-y-1">
                          {getMessageTemplates(user).map((template) => (
                            <a
                              key={template.id}
                              href={getWhatsAppLink(user.whatsapp, template.text)}
                              target="_blank"
                              onClick={() => setOpenMessageId(null)}
                              className="block p-3 hover:bg-emerald-50 rounded-xl transition-colors group/item"
                            >
                              <p className="text-sm font-bold text-slate-900 group-hover/item:text-emerald-700">{template.label}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">"{template.text}"</p>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-[120px]">
                    <div className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-medium flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Unido: {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${user.last_sign_in_at ? 'bg-emerald-50/50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Sessión: {formatRelativeTime(user.last_sign_in_at)}</span>
                    </div>
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
