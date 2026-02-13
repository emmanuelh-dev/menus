import React, { useState, useEffect } from 'react';
import { Mail, Phone, User, Calendar, Search, ExternalLink, Utensils, Clock, Send, Trash2 } from 'lucide-react';

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

type ContactStatus = 'contacted' | 'not_reached';

const AdminUserList = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [phoneFilter, setPhoneFilter] = useState<'all' | 'with' | 'without'>('all');
  const [placeFilter, setPlaceFilter] = useState<'all' | 'with' | 'without'>('all');
  const [loginFilter, setLoginFilter] = useState<'all' | 'v1d' | 'v3d' | 'v7d' | 'never'>('all');
  const [contactFilter, setContactFilter] = useState<'all' | 'contacted' | 'not_contacted'>('all');
  const [activeMenu, setActiveMenu] = useState<{ id: string, type: 'whatsapp' | 'email' } | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ id: string, status: 'success' | 'error' } | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [contactedUsers, setContactedUsers] = useState<Record<string, ContactStatus>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('admin_whatsapp_contacted_users');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const normalized: Record<string, ContactStatus> = {};
        Object.entries(parsed).forEach(([userId, value]) => {
          if (value === true || value === 'contacted') {
            normalized[userId] = 'contacted';
            return;
          }

          if (value === 'not_reached') {
            normalized[userId] = 'not_reached';
          }
        });
        setContactedUsers(normalized);
      }
    } catch (error) {
      console.error('Error loading contacted users from storage:', error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('admin_whatsapp_contacted_users', JSON.stringify(contactedUsers));
    } catch (error) {
      console.error('Error saving contacted users to storage:', error);
    }
  }, [contactedUsers]);

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

        if (loginFilter === 'v1d') matchesLogin = diffDays > 1;
        else if (loginFilter === 'v3d') matchesLogin = diffDays > 3;
        else if (loginFilter === 'v7d') matchesLogin = diffDays > 7;
        else if (loginFilter === 'never') matchesLogin = false;
      }
    }

    // Filter by Contact status
    const isContacted = contactedUsers[user.id] === 'contacted';
    const matchesContact =
      contactFilter === 'all' ||
      (contactFilter === 'contacted' && isContacted) ||
      (contactFilter === 'not_contacted' && !isContacted);

    return matchesSearch && matchesPhone && matchesPlace && matchesLogin && matchesContact;
  });

  const getWhatsAppAppLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const getWhatsAppWebLink = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  };

  const setContactStatus = (userId: string, status: ContactStatus) => {
    setContactedUsers((prev) => {
      const next = { ...prev };

      if (next[userId] === status) {
        delete next[userId];
      } else {
        next[userId] = status;
      }

      return next;
    });
  };

  const getMessageTemplates = (user: UserProfile) => {
    const firstName = user.name?.split(' ')[0] || 'hola';
    const business = user.business_name || (user.places && user.places[0]) || 'tu negocio';

    return [
      {
        id: 'welcome',
        label: 'Bienvenida',
        subject: `¡Bienvenido, ${firstName}! Te apoyamos con ${business}`,
        text: `Hola ${firstName}, gracias por registrarte en Menús BysMax para ${business}. Si tienes alguna duda o sugerencia en la que te podamos ayudar para mejorar tu negocio, estoy aquí para ayudarte.`
      },
      {
        id: 'support-business',
        label: 'Soporte',
        subject: `Ayuda con ${business}`,
        text: `Hola ${firstName}, gracias por registrarte en Menús BysMax para ${business}. Si tienes alguna duda o sugerencia en la que te podamos ayudar para mejorar tu negocio, estoy aquí para ayudarte.`
      },
      {
        id: 'no-menu',
        label: 'Sin Menú',
        subject: `¿Te ayudamos con tu menú, ${firstName}?`,
        text: `Hola ${firstName}, gracias por registrarte en Menús BysMax para ${business}. Si tienes alguna duda o sugerencia en la que te podamos ayudar para mejorar tu negocio, estoy aquí para ayudarte a crear tu primer menú.`
      }
    ];
  };

  const handleSendEmail = async (user: UserProfile, template: any) => {
    setSendingEmailId(`${user.id}-${template.id}`);
    setEmailStatus(null);

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject: template.subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 12px;">
              <h2 style="color: #10b981;">Menús BysMax</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">${template.text}</p>
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #666;">
                Este es un mensaje de seguimiento de Menús BysMax para ayudarte a digitalizar tu negocio.
              </p>
            </div>
          `
        })
      });

      if (response.ok) {
        setEmailStatus({ id: `${user.id}-${template.id}`, status: 'success' });
        setTimeout(() => setEmailStatus(null), 3000);
      } else {
        const error = await response.json();
        alert(error.error || "Error al enviar email");
        setEmailStatus({ id: `${user.id}-${template.id}`, status: 'error' });
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setSendingEmailId(null);
      setActiveMenu(null);
    }
  };

  const handleTestEmail = async () => {
    const testTo = prompt("Introduce el correo para la prueba:", "emmanuelh.dev@gmail.com");
    if (!testTo) return;

    setTestingEmail(true);
    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testTo,
          subject: "Prueba de envío - Menús BysMax",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #eee; border-radius: 24px; text-align: center;">
              <div style="background: #10b981; width: 64px; height: 64px; border-radius: 20px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 32px;">✓</span>
              </div>
              <h1 style="color: #0f172a; margin-bottom: 12px; font-weight: 800;">¡Funciona perfectamente!</h1>
              <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
                Esta es una prueba de configuración de Resend desde tu panel de administración. 
                Tus plantillas de seguimiento ya están listas para ser enviadas a tus clientes.
              </p>
              <div style="background: #f8fafc; padding: 20px; border-radius: 16px; text-align: left;">
                <p style="margin: 0; font-size: 12px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Detalles técnicos</p>
                <code style="display: block; font-size: 13px; color: #334155;">Servicio: Resend API</code>
                <code style="display: block; font-size: 13px; color: #334155;">Fecha: ${new Date().toLocaleString()}</code>
              </div>
            </div>
          `
        })
      });

      if (response.ok) {
        alert("¡Email de prueba enviado con éxito!");
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setTestingEmail(false);
    }
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

  const handleDeleteUser = async (targetUser: UserProfile) => {
    const confirmed = window.confirm(`¿Eliminar usuario ${targetUser.email}? También se eliminarán sus establecimientos.`);
    if (!confirmed) return;

    setDeletingUserId(targetUser.id);

    try {
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUser.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.error || 'No se pudo eliminar el usuario');
        return;
      }

      setUsers((prev) => prev.filter((user) => user.id !== targetUser.id));
      setContactedUsers((prev) => {
        const next = { ...prev };
        delete next[targetUser.id];
        return next;
      });
    } catch (requestError) {
      alert('Error de conexión al eliminar usuario');
    } finally {
      setDeletingUserId((current) => (current === targetUser.id ? null : current));
    }
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
            {/* Options or count could go here */}
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
                { id: 'v1d', label: '> 1 día' },
                { id: 'v3d', label: '> 3 días' },
                { id: 'v7d', label: '> 7 días' },
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

          <div className="flex bg-slate-200/50 p-1 rounded-2xl shrink-0">
            <button
              onClick={handleTestEmail}
              disabled={testingEmail}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
            >
              {testingEmail ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Enviar Prueba
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Contacto:</div>
            <div className="flex bg-slate-200/50 p-1 rounded-2xl shadow-inner">
              <button
                onClick={() => setContactFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${contactFilter === 'all'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Todos
              </button>
              <button
                onClick={() => setContactFilter('contacted')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${contactFilter === 'contacted'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                Contactados
              </button>
              <button
                onClick={() => setContactFilter('not_contacted')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${contactFilter === 'not_contacted'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                No contactados
              </button>
            </div>
          </div>
        </div>

        <div className="flex bg-slate-100/50 px-4 py-2 rounded-2xl border border-slate-100 flex-wrap items-center justify-between gap-4">
          <div className="text-xs font-medium text-slate-500">
            Mostrando <span className="text-slate-900 font-bold">{filteredUsers.length}</span> usuarios
          </div>
          {/* Add template preview link or similar if needed here */}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className={`bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative ${activeMenu?.id === user.id ? 'z-50' : 'z-0'}`}
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
                        {contactedUsers[user.id] === 'contacted' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">
                            Contactado
                          </span>
                        )}
                        {contactedUsers[user.id] === 'not_reached' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                            No se pudo contactar
                          </span>
                        )}
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

                <div className="flex flex-wrap items-center gap-3 md:self-center">
                  {/* WhatsApp Button Cluster */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu?.id === user.id && activeMenu?.type === 'whatsapp' ? null : { id: user.id, type: 'whatsapp' })}
                      className="px-4 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-95  shadow-emerald-500/10"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>

                    {activeMenu?.id === user.id && activeMenu?.type === 'whatsapp' && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-emerald-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-emerald-50 border-b border-emerald-100 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                          Plantillas WhatsApp
                        </div>
                        <div className="p-1">
                          {getMessageTemplates(user).map((template) => (
                            <div
                              key={template.id}
                              className="block p-3 hover:bg-emerald-50 rounded-xl transition-colors group/item"
                            >
                              <p className="text-xs font-bold text-slate-800">{template.label}</p>
                              <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">"{template.text}"</p>
                              <div className="mt-3 flex items-center gap-2">
                                <a
                                  href={getWhatsAppAppLink(user.whatsapp, template.text)}
                                  target="_blank"
                                  onClick={() => setActiveMenu(null)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors"
                                >
                                  WhatsApp
                                </a>
                                <a
                                  href={getWhatsAppWebLink(user.whatsapp, template.text)}
                                  target="_blank"
                                  onClick={() => setActiveMenu(null)}
                                  className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider hover:bg-emerald-50 transition-colors"
                                >
                                  WhatsApp Web
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setContactStatus(user.id, 'contacted')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${contactedUsers[user.id] === 'contacted'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                  >
                    Marcar contactado
                  </button>

                  <button
                    onClick={() => setContactStatus(user.id, 'not_reached')}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${contactedUsers[user.id] === 'not_reached'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                      }`}
                  >
                    No se pudo contactar
                  </button>

                  <button
                    onClick={() => handleDeleteUser(user)}
                    disabled={deletingUserId === user.id}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 disabled:opacity-50"
                    title="Eliminar usuario"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingUserId === user.id ? 'Eliminando' : 'Eliminar usuario'}
                    </span>
                  </button>

                  {/* Impersonate Button */}
                  <button
                    onClick={async () => {
                      if (confirm(`¿Estás seguro de que quieres iniciar sesión como ${user.name || user.email}?`)) {
                        try {
                          const res = await fetch('/api/admin/impersonate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id })
                          });
                          if (res.ok) {
                            window.location.href = '/admin/dashboard';
                          } else {
                            alert('Error al impersonar');
                          }
                        } catch (e) {
                          alert('Error de conexión');
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-purple-700 transition-all active:scale-95 shadow-purple-500/10"
                    title="Simular Usuario"
                  >
                    <User className="w-3.5 h-3.5" />
                    Simular
                  </button>

                  {/* Email Button Cluster */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveMenu(activeMenu?.id === user.id && activeMenu?.type === 'email' ? null : { id: user.id, type: 'email' })}
                      className="px-4 py-2.5 bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95  shadow-blue-500/10"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>

                    {activeMenu?.id === user.id && activeMenu?.type === 'email' && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-blue-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 bg-blue-50 border-b border-blue-100 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                          Plantillas Email
                        </div>
                        <div className="p-1">
                          {getMessageTemplates(user).map((template) => (
                            <button
                              key={template.id}
                              onClick={() => handleSendEmail(user, template)}
                              disabled={sendingEmailId === `${user.id}-${template.id}`}
                              className="w-full text-left p-3 hover:bg-blue-50 rounded-xl transition-colors group/item disabled:opacity-50"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-800">{template.label}</p>
                                {sendingEmailId === `${user.id}-${template.id}` && (
                                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-slate-600 mt-1">Asunto: {template.subject}</p>
                              <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">{template.text}</p>
                            </button>
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
                    <div className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 ${user.last_sign_in_at ? 'bg-emerald-50/50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>Sesión: {formatRelativeTime(user.last_sign_in_at)}</span>
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
