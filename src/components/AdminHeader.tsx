import React, { useState, useEffect } from 'react'

function AdminHeader() {
    const [isOpen, setIsOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);

    // Check if the device is mobile on component mount and window resize
    useEffect(() => {
        const checkIfMobile = () => {
            const isMobileWidth = window.innerWidth < 768;
            setIsMobile(isMobileWidth);
            setIsOpen(!isMobileWidth);
        };

        // Initial check
        checkIfMobile();

        // Add event listener
        window.addEventListener('resize', checkIfMobile);

        // Cleanup
        return () => window.removeEventListener('resize', checkIfMobile);
    }, []);

    return (
        <>
            {/* Mobile toggle button */}
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
                    <h1 className="text-xl font-bold text-gray-900 mb-8">Panel de Administrador</h1>
                    <nav className="flex flex-col space-y-4">
                        <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900 py-2 px-4 rounded hover:bg-gray-100">Dashboard</a>
                        <a href="/admin/restaurants" className="text-gray-600 hover:text-gray-900 py-2 px-4 rounded hover:bg-gray-100">Restaurantes</a>
                        <a href="/admin/contacts" className="text-gray-600 hover:text-gray-900 py-2 px-4 rounded hover:bg-gray-100">Contactos</a>
                        <button id="logout-btn" className="text-red-600 hover:text-red-900 py-2 px-4 rounded hover:bg-red-50 mt-8">Cerrar sesión</button>
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