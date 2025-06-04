import React, { useState, useEffect } from 'react'

function AdminHeader() {
    const [isOpen, setIsOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkIfMobile = () => {
            const isMobileWidth = window.innerWidth < 768;
            setIsMobile(isMobileWidth);
            setIsOpen(!isMobileWidth);
        };

        checkIfMobile();

        window.addEventListener('resize', checkIfMobile);

        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    return (
        <>
            <div className="flex-grow w-full px-8 py-6">
                {isMobile && (
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="md:hidden"
                        aria-label={isOpen ? "Close menu" : "Open menu"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isOpen
                                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            }
                        </svg>
                    </button>
                )}
            </div>

            {/* Sidebar */}
            <aside className={`
                bg-white shadow-md 
                w-64 h-screen
                fixed left-0 top-0 z-10 
                transition-transform duration-300 ease-in-out 
                ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
                md:translate-x-0 
                lg:block
            `}>
                <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-900 mb-8">Panel de Administrador</h1>                    <nav className="flex flex-col space-y-2">
                        <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900 py-2 px-4 rounded hover:bg-gray-100 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                            </svg>
                            Dashboard
                        </a>
                        <a href="/admin/restaurants" className="text-gray-600 hover:text-gray-900 py-2 px-4 rounded hover:bg-gray-100 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Restaurantes
                        </a>
                        
                        <div className="border-t border-gray-200 my-2 pt-2">
                            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Sistema de Menús</div>
                            <a href="/admin/menus" className="text-gray-600 hover:text-gray-900 py-2 px-4 rounded hover:bg-gray-100 flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                Gestión de Menús
                            </a>
                        </div>
                        
                        <a href="/admin/contacts" className="text-gray-600 hover:text-gray-900 py-2 px-4 rounded hover:bg-gray-100 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Contactos
                        </a>
                        
                        <button id="logout-btn" className="text-red-600 hover:text-red-900 py-2 px-4 rounded hover:bg-red-50 mt-8 flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Cerrar sesión
                        </button>
                    </nav>
                </div>
            </aside>

            {/* Overlay for mobile when sidebar is open */}
            {isOpen && isMobile && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-0 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    )
}

export default AdminHeader