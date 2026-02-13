import React, { useState, useEffect } from 'react'
import { UtensilsCrossed, BarChart3, ExternalLink } from 'lucide-react'

type PlaceDetails = {
  name: string;
  location: string;
  publicPath: string;
};

type PlaceNavItem = {
  label: string;
  href: string;
  paths: string[];
  exact?: boolean;
};

function getPlaceRouteContext(path: string) {
  const match = path.match(/^\/admin\/place\/([^/]+)(?:\/(.*))?$/);
  if (!match) return null;

  const [, placeId, section = ''] = match;
  return { placeId, section };
}

function getPlaceSectionLabel(section: string) {
  if (!section) return 'Dashboard';
  if (section.startsWith('settings')) return 'Menú';
  if (section.startsWith('caja') || section.startsWith('orders')) return 'Caja';
  if (section.startsWith('shipping')) return 'Zonas de envío';
  if (section.startsWith('insights')) return 'Analíticas';
  if (section.startsWith('pos')) return 'POS táctil';
  if (section.startsWith('comanda')) return 'Nueva comanda';
  if (section.startsWith('mesas')) return 'Mapa de mesas';
  if (section.startsWith('arqueo')) return 'Arqueos';
  return 'Sección';
}

function getPlaceLocation(place: any) {
  const city = place?.city || place?.municipality || place?.municipio || '';
  const state = place?.state || place?.states?.name || '';
  return [city, state].filter(Boolean).join(', ');
}

function getPublicPath(place: any) {
  if (!place) return '';

  if (place?.menu) {
    return place.menu;
  }

  if (place?.type === 'motel' && place?.states?.slug) {
    return `/moteles/estados/${place.states.slug}/${place.short_name}`;
  }

  return `/menus/${place?.short_name || ''}`;
}

function getPlaceNavItems(placeId: string): PlaceNavItem[] {
  const basePath = `/admin/place/${placeId}`;
  return [
    {
      label: 'Dashboard',
      href: basePath,
      paths: [basePath],
      exact: true
    },
    {
      label: 'Menú',
      href: `${basePath}/settings`,
      paths: [`${basePath}/settings`]
    },
    {
      label: 'Caja',
      href: `${basePath}/caja`,
      paths: [`${basePath}/caja`, `${basePath}/orders`]
    },
    {
      label: 'Zonas',
      href: `${basePath}/shipping`,
      paths: [`${basePath}/shipping`]
    },
    {
      label: 'Analíticas',
      href: `${basePath}/insights`,
      paths: [`${basePath}/insights`]
    },
    {
      label: 'POS',
      href: `${basePath}/pos`,
      paths: [`${basePath}/pos`]
    },
    {
      label: 'Comanda',
      href: `${basePath}/comanda`,
      paths: [`${basePath}/comanda`]
    },
    {
      label: 'Mesas',
      href: `${basePath}/mesas`,
      paths: [`${basePath}/mesas`]
    },
    {
      label: 'Arqueos',
      href: `${basePath}/arqueo`,
      paths: [`${basePath}/arqueo`]
    }
  ];
}

function isPlaceItemActive(currentPath: string, item: PlaceNavItem) {
  return item.paths.some((path) => {
    if (item.exact) return currentPath === path;
    return currentPath === path || currentPath.startsWith(`${path}/`);
  });
}

function AdminHeader() {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails>({ name: '', location: '', publicPath: '' });

  const [impersonating, setImpersonating] = useState<any>(null);
  const [isMagicSession, setIsMagicSession] = useState(false);
  const [isMagicBannerVisible, setIsMagicBannerVisible] = useState(false);

  useEffect(() => {
    // Si el banner es visible, ocultarlo a los 5 segundos
    if (isMagicBannerVisible) {
      const timer = setTimeout(() => {
        setIsMagicBannerVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isMagicBannerVisible]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const updateCurrentPath = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('popstate', updateCurrentPath);
    document.addEventListener('astro:page-load', updateCurrentPath);
    updateCurrentPath();

    const checkIfMobile = () => {
      const isMobileWidth = window.innerWidth < 1024; // Aumentamos a 1024 para incluir tablets
      setIsMobile(isMobileWidth);

      // Si es comanda, cerramos por defecto
      const isComanda = window.location.pathname.includes('/comanda');
      const shouldBeOpen = !isMobileWidth && !isComanda;

      setIsOpen(shouldBeOpen);
      updateBodyClass(shouldBeOpen);
    };

    const updateBodyClass = (open: boolean) => {
      if (open) {
        document.documentElement.classList.remove('sidebar-collapsed');
      } else {
        document.documentElement.classList.add('sidebar-collapsed');
      }
    };

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        if (data.user) {
          setUserEmail(data.user.email);
        }
        if (data.isAdmin) {
          setIsAdminUser(true);
        }
        if (data.impersonating) {
          setImpersonating(data.impersonating);
        }
        if (data.isMagic) {
          setIsMagicSession(true);
          // Solo mostrar banner si NO estamos impersonando (para evitar doble banner)
          if (!data.impersonating) {
            setIsMagicBannerVisible(true);
          }
        }
      } catch (e) {
        console.error("Error fetching user", e);
      }
    };

    checkIfMobile();
    fetchUser();
    window.addEventListener('resize', checkIfMobile);
    return () => {
      window.removeEventListener('resize', checkIfMobile);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('popstate', updateCurrentPath);
      document.removeEventListener('astro:page-load', updateCurrentPath);
    };
  }, []);

  const placeContext = getPlaceRouteContext(currentPath);
  const activePlaceId = placeContext?.placeId || null;
  const placeSectionLabel = placeContext ? getPlaceSectionLabel(placeContext.section) : '';
  const placeNavItems = activePlaceId ? getPlaceNavItems(activePlaceId) : [];

  useEffect(() => {
    if (!activePlaceId) {
      setPlaceDetails({ name: '', location: '', publicPath: '' });
      return;
    }

    let cancelled = false;

    const fetchPlaceDetails = async () => {
      try {
        const response = await fetch(`/api/admin/place/${activePlaceId}`);
        if (!response.ok) {
          if (!cancelled) {
            setPlaceDetails({
              name: `Restaurante ${activePlaceId}`,
              location: '',
              publicPath: ''
            });
          }
          return;
        }

        const data = await response.json();
        const place = data?.place || {};

        if (!cancelled) {
          setPlaceDetails({
            name: place?.name || `Restaurante ${activePlaceId}`,
            location: getPlaceLocation(place),
            publicPath: getPublicPath(place)
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPlaceDetails({
            name: `Restaurante ${activePlaceId}`,
            location: '',
            publicPath: ''
          });
        }
        console.error('Error al cargar contexto del restaurante:', error);
      }
    };

    fetchPlaceDetails();

    return () => {
      cancelled = true;
    };
  }, [activePlaceId]);

  const handleStopImpersonation = async () => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: null })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (e) {
      console.error("Error stopping impersonation", e);
    }
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

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
      {/* Banner de Impersonación */}
      {impersonating && (
        <div className="fixed top-0 left-0 right-0 bg-purple-600 text-white px-4 py-2 z-[300] flex items-center justify-center gap-4 shadow-lg animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Modo Simulación: <span className="underline decoration-purple-300 underline-offset-2">{impersonating.id}</span>
          </div>
          <button
            onClick={handleStopImpersonation}
            className="bg-white text-purple-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-50 transition-all active:scale-95"
          >
            Detener
          </button>
        </div>
      )}

      {/* Banner de Magic Session (Se oculta en 5s) */}
      {isMagicBannerVisible && !impersonating && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white px-4 py-2 z-[300] flex items-center justify-center gap-4 shadow-lg animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Sesión de Acceso Rápido (Magic Link)
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-amber-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all active:scale-95"
          >
            Salir
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 bg-white">
        <button
          onClick={() => {
            const newState = !isOpen;
            setIsOpen(newState);
            if (newState) {
              document.documentElement.classList.remove('sidebar-collapsed');
            } else {
              document.documentElement.classList.add('sidebar-collapsed');
            }
          }}
          className="p-2.5 bg-white rounded-xl shadow-sm hover:bg-gray-50 transition-all text-gray-500"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {activePlaceId && (
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">{placeSectionLabel}</div>
                <div className="text-sm font-semibold text-gray-900 truncate">{placeDetails.name || `Restaurante ${activePlaceId}`}</div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/admin/place/${activePlaceId}/settings`}
                  className={`px-2.5 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5 ${isMobile ? 'text-xs' : 'text-[11px] font-bold uppercase tracking-wider'}`}
                  title="Editar menú"
                >
                  <UtensilsCrossed size={14} />
                  {!isMobile && 'Menú'}
                </a>
                {!isMobile && (
                  <a
                    href={`/admin/place/${activePlaceId}/insights`}
                    className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <BarChart3 size={14} />
                    Insights
                  </a>
                )}
                {placeDetails.publicPath && (
                  <a
                    href={placeDetails.publicPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-2.5 py-1.5 rounded-md bg-gray-900 text-white hover:bg-black transition-colors inline-flex items-center gap-1.5 ${isMobile ? 'text-xs' : 'text-[11px] font-bold uppercase tracking-wider'}`}
                  >
                    <ExternalLink size={14} />
                    {!isMobile && 'Ver público'}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className={`
                bg-white border-r border-gray-200
          w-64 h-[100dvh]
                fixed left-0 top-0 z-[200]
          transition-transform duration-300 ease-in-out overflow-hidden
                ${!isOpen ? '-translate-x-full' : 'translate-x-0'}
            `}>
        <div className="flex flex-col h-[100dvh]">
          <div className="p-6 border-b border-gray-100 mt-6">
            <h1 className="text-lg font-semibold text-gray-900">Menús</h1>
            <p className="text-xs text-gray-500 mt-0.5">Panel de control</p>
          </div>

          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
            {activePlaceId && (
              <div className="pb-3 mb-3 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2">
                  {placeDetails.name || `Restaurante ${activePlaceId}`}
                </div>

                {placeNavItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`${isPlaceItemActive(currentPath, item)
                      ? 'bg-gray-900 text-white font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    {item.label}
                  </a>
                ))}
              </div>
            )}

            <a
              href="/admin/dashboard"
              className={`${isActive('/admin/dashboard')
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>

            <a
              href="/admin/profile"
              className={`${isActive('/admin/profile')
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Mi Perfil
            </a>

            <a
              href="/admin/customers"
              className={`${isActive('/admin/customers')
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Clientes
            </a>

            {/*
              <a 
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
              </a>
            */}


            <a
              href="/admin/contacts"
              className={`${isActive('/admin/contacts')
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Contactos
            </a>

            <a
              href="/admin/comments"
              className={`${isActive('/admin/comments')
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Reseñas
            </a>

            {isAdminUser && (
              <div className="pt-4 pb-2">
                <div className="text-xs font-medium text-gray-400 uppercase tracking-wider px-3 mb-2">
                  Administrador
                </div>
                <a
                  href="/admin/users"
                  className={`${isActive('/admin/users')
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Usuarios Registrados
                </a>
                <a
                  href="/admin/history"
                  className={`${isActive('/admin/history')
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Historial IA
                </a>
                <a
                  href="/admin/blog-images"
                  className={`${isActive('/admin/blog-images')
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } flex items-center px-3 py-2 text-sm rounded-md transition-colors`}
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Fotos Blog
                </a>
              </div>
            )}
          </nav>

          <div className="p-3 border-t border-gray-100 flex flex-col gap-2 shrink-0 bg-white">
            {deferredPrompt && (
              <button
                onClick={handleInstall}
                className="w-full flex items-center px-3 py-2 text-sm text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors font-bold"
              >
                <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Instalar App
              </button>
            )}
            <a
              href="https://wa.me/528126060795"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full gap-4 flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >

              <svg xmlns="http://www.w3.org/2000/svg" fill="#075E54" className="text-green-700" width="15px" height="15px" viewBox="0 0 32 32" version="1.1">
                <title>whatsapp</title>
                <path d="M26.576 5.363c-2.69-2.69-6.406-4.354-10.511-4.354-8.209 0-14.865 6.655-14.865 14.865 0 2.732 0.737 5.291 2.022 7.491l-0.038-0.070-2.109 7.702 7.879-2.067c2.051 1.139 4.498 1.809 7.102 1.809h0.006c8.209-0.003 14.862-6.659 14.862-14.868 0-4.103-1.662-7.817-4.349-10.507l0 0zM16.062 28.228h-0.005c-0 0-0.001 0-0.001 0-2.319 0-4.489-0.64-6.342-1.753l0.056 0.031-0.451-0.267-4.675 1.227 1.247-4.559-0.294-0.467c-1.185-1.862-1.889-4.131-1.889-6.565 0-6.822 5.531-12.353 12.353-12.353s12.353 5.531 12.353 12.353c0 6.822-5.53 12.353-12.353 12.353h-0zM22.838 18.977c-0.371-0.186-2.197-1.083-2.537-1.208-0.341-0.124-0.589-0.185-0.837 0.187-0.246 0.371-0.958 1.207-1.175 1.455-0.216 0.249-0.434 0.279-0.805 0.094-1.15-0.466-2.138-1.087-2.997-1.852l0.010 0.009c-0.799-0.74-1.484-1.587-2.037-2.521l-0.028-0.052c-0.216-0.371-0.023-0.572 0.162-0.757 0.167-0.166 0.372-0.434 0.557-0.65 0.146-0.179 0.271-0.384 0.366-0.604l0.006-0.017c0.043-0.087 0.068-0.188 0.068-0.296 0-0.131-0.037-0.253-0.101-0.357l0.002 0.003c-0.094-0.186-0.836-2.014-1.145-2.758-0.302-0.724-0.609-0.625-0.836-0.637-0.216-0.010-0.464-0.012-0.712-0.012-0.395 0.010-0.746 0.188-0.988 0.463l-0.001 0.002c-0.802 0.761-1.3 1.834-1.3 3.023 0 0.026 0 0.053 0.001 0.079l-0-0.004c0.131 1.467 0.681 2.784 1.527 3.857l-0.012-0.015c1.604 2.379 3.742 4.282 6.251 5.564l0.094 0.043c0.548 0.248 1.25 0.513 1.968 0.74l0.149 0.041c0.442 0.14 0.951 0.221 1.479 0.221 0.303 0 0.601-0.027 0.889-0.078l-0.031 0.004c1.069-0.223 1.956-0.868 2.497-1.749l0.009-0.017c0.165-0.366 0.261-0.793 0.261-1.242 0-0.185-0.016-0.366-0.047-0.542l0.003 0.019c-0.092-0.155-0.34-0.247-0.712-0.434z" />
              </svg>
              ¿Duda o sugerencia?
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar sesión
            </button>

            <div className="px-8 text-center text-gray-500 text-xs">
              &copy; {new Date().getFullYear()} Menús BysMax.
            </div>
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