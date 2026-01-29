import React, { useState, useEffect } from "react";

interface Contact {
  id: string;
  email: string;
  message: string;
  created_at: string;
}

export default function ContactContainer() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/admin/contacts-data");
      if (response.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setContacts(data.contacts || []);
      } else {
        throw new Error(data.error || "Error al cargar contactos");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este mensaje?")) {
      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setContacts(contacts.filter((c) => c.id !== id));
        } else {
          const data = await response.json();
          alert(data.error || "Error al eliminar el mensaje");
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Error al eliminar el mensaje");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      {contacts.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <div className="px-4 py-4 sm:px-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {contact.email}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-50 text-emerald-700">
                      {new Date(contact.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="text-sm text-slate-500">{contact.message}</p>
                  </div>
                  <div className="mt-2 flex items-center text-sm sm:mt-0 space-x-2">
                    <button
                      onClick={() => handleDelete(contact.id)}
                      className="px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-4 py-12 sm:px-6 text-center">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium tracking-tight">No hay mensajes de contacto aún.</p>
        </div>
      )}
    </div>
  );
}
