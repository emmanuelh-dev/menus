import React from 'react';

interface Props {
  children?: React.ReactNode;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

/**
 * Componente unificado para los headers de las páginas del administrador.
 * Maneja el posicionamiento sticky, el efecto de desenfoque y la estructura responsiva.
 */
export default function AdminPageHeader({
  children,
  leftContent,
  rightContent,
  className = '',
  sticky = true
}: Props) {
  const headerClassName = sticky
    ? 'sticky top-0 z-40 bg-gray-100/95 backdrop-blur supports-[backdrop-filter]:bg-gray-100/85 shadow-md'
    : 'bg-gray-100/90';

  return (
    <header
      className={`${headerClassName} py-3 px-4 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-[1600px] mx-auto">
        {/* Lado Izquierdo o área de Tabs */}
        {leftContent && (
          <div className="flex items-center gap-2 w-full overflow-x-auto pb-1 sm:pb-0 hide-scrollbar scroll-smooth">
            {leftContent}
          </div>
        )}

        {/* Área central (opcional) */}
        {children && (
          <div className="flex-1 flex items-center justify-center">
            {children}
          </div>
        )}

        {/* Lado Derecho (Acciones) */}
        {rightContent && (
          <div className="flex items-center gap-2 w-full transition-all">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  );
}
