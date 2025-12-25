import React, { useState, useEffect } from 'react'

function AdminHeader() {
    const [isOpen, setIsOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        setCurrentPath(window.location.pathname);
        
        const checkIfMobile = () => {
            const isMobileWidth = window.innerWidth < 768;
            setIsMobile(isMobileWidth);
            setIsOpen(!isMobileWidth);
        };

        checkIfMobile();
        window.addEventListener('resize', checkIfMobile);
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/admin/login';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '/admin/login';
        }
    };

    const isActive = (path: string) => currentPath.startsWith(path);

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
                bg-white border-r border-gray-200
                w-64 h-screen
                fixed left-0 top-0 z-10 
                transition-transform duration-300 ease-in-out 
                ${isMobile && !isOpen ? '-translate-x-full' : 'translate-x-0'}
                md:translate-x-0 
                lg:block
            `}>
                <div className="flex flex-col h-[100dvh]">
                    <div className="p-6 border-b border-gray-100">
                        <h1 className="text-lg font-semibold text-gray-900">Menús</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Panel de control</p>
                    </div>

                    <nav className="flex-1 px-3 py-4 space-y-0.5">
                        <a 
                            href="/admin/dashboard" 
                            className={`${
                                isActive('/admin/dashboard')
                                    ? 'bg-gray-100 text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                        >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Dashboard
                        </a>
                        
                        {/* <a 
                            href="/admin/restaurants" 
                            className={`${
                                isActive('/admin/restaurants')
                                    ? 'bg-gray-100 text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                        >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            Restaurantes
                        </a> */}
                        
                        <div className="pt-4 pb-2">
                            <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2">
                                Menús
                            </div>
                            <a 
                                href="/admin/menus" 
                                className={`${
                                    isActive('/admin/menus')
                                        ? 'bg-gray-100 text-gray-900 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                            >
                                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                                Administrar 
                            </a>
                        </div>
                        
                        <a 
                            href="/admin/contacts" 
                            className={`${
                                isActive('/admin/contacts')
                                    ? 'bg-gray-100 text-gray-900 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                        >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Contactos
                        </a>
                    </nav>

                    <div className="p-3 border-t border-gray-100">
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
                        >
                            <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Cerrar sesión
                        </button>
                    </div>
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