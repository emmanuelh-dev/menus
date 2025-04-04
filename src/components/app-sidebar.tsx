import * as React from "react";
import { useSidebar } from "./ui/sidebar";

export function AppSidebar() {
  const { isOpen } = useSidebar();

  return (
    <aside
      className={`
        fixed left-0 top-0 z-40
        h-screen w-64 
        bg-white dark:bg-dark-secondary
        shadow-md
        transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
      `}
    >
      <div className="flex h-16 shrink-0 items-center border-b px-6 dark:border-gray-800">
        <h1 className="text-lg font-semibold">Panel de Administrador</h1>
      </div>
      <nav className="space-y-1 px-4 py-4">
        <a
          href="/admin/restaurants"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <span>Restaurantes</span>
        </a>
        <a
          href="/admin/contacts"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-600 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          <span>Contactos</span>
        </a>
        <button
          id="logout-btn"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-red-600 transition-all hover:text-red-900 dark:text-red-400 dark:hover:text-red-50"
        >
          <span>Cerrar sesión</span>
        </button>
      </nav>
    </aside>
  );
}