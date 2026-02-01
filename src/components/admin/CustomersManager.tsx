import React, { useState, useEffect } from 'react';
import {
  User, Phone, Mail, Search, Edit2,
  Trash2, ExternalLink, Plus, Save, X,
  MapPin, Clock
} from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  default_address?: string;
  created_at: string;
}

export default function CustomersManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer?.name || !editingCustomer?.phone) return;

    setIsSubmitting(true);
    try {
      const method = editingCustomer.id ? 'PUT' : 'POST';
      const response = await fetch('/api/customers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCustomer)
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingCustomer(null);
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;
    try {
      // Assuming we have a delete endpoint or can use PUT with a flag, 
      // but traditionally it's a DELETE. Let's check api/customers/[id].ts
      const response = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (response.ok) fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  if (loading) return null;

  return (
    <div className="space-y-6 px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Mis Clientes</h2>
          <p className="text-slate-500 text-sm">Gestiona tu base de datos de comensales y contactos.</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer({});
            setIsModalOpen(true);
          }}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-100"
        >
          <Plus size={18} />
          Nuevo Cliente
        </button>
      </div>

      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[24px] outline-none shadow-sm focus:ring-4 focus:ring-slate-100 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map(customer => (
            <div key={customer.id} className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{customer.name}</h3>
                    <p className="text-slate-400 text-sm flex items-center gap-1">
                      <Clock size={12} />
                      Registrado: {new Date(customer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingCustomer(customer);
                      setIsModalOpen(true);
                    }}
                    className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={`https://wa.me/52${customer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-700 rounded-2xl group/link hover:bg-emerald-100 transition-all"
                >
                  <Phone size={18} />
                  <span className="font-bold flex-1">{customer.phone}</span>
                  <ExternalLink size={16} className="opacity-0 group-hover/link:opacity-100 transition-all" />
                </a>

                {customer.default_address && (
                  <div className="flex items-center gap-3 p-4 bg-slate-50 text-slate-600 rounded-2xl">
                    <MapPin size={18} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-medium line-clamp-2">{customer.default_address}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const message = encodeURIComponent(`¡Hola ${customer.name}! Gracias por tu preferencia. ¿Te gustaría ordenar algo hoy?`);
                      window.open(`https://wa.me/52${customer.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
                    }}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all"
                  >
                    Saludo WhatsApp
                  </button>
                </div>
                <button
                  onClick={() => handleDelete(customer.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 text-center">
            <User className="mx-auto text-slate-300 mb-4" size={48} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No hay clientes registrados</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-900">
                {editingCustomer?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold"
                  value={editingCustomer?.name || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">WhatsApp / Teléfono</label>
                <input
                  type="tel"
                  required
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none focus:ring-4 focus:ring-slate-100 transition-all font-bold"
                  value={editingCustomer?.phone || ''}
                  onChange={e => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                  placeholder="Ej: 8111223344"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-100 hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Save size={18} />
                {isSubmitting ? 'Guardando...' : 'Guardar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
