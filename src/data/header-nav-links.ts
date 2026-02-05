export const navItems = [
    { name: "Menús", href: "/menus" },
    { name: "Blog", href: "/blog" },
    { name: "Precios", href: "/precios" },
    { name: "Software para Restaurantes", href: "/software-para-restaurantes" },
    { name: "Punto de Venta", href: "/punto-de-venta-restaurantes" },
    { name: "Delivery", href: "/delivery-para-restaurantes" },
    { name: "Comidas Rápidas", href: "/software-comida-rapida" },
    { name: "Sistema de Comandas", href: "/sistema-comandas-restaurantes" },
    { name: "Generador QR", href: "/generador-qr" },
    { name: "Pedidos WhatsApp", href: "/pedidos-whatsapp" },
    { name: "Moteles", href: "/moteles" },
    { name: "Contacto", href: "/contact" },
];

export const platformLinks = [
    { 
        name: "Software para Restaurantes", 
        href: "/software-para-restaurantes",
        description: "Gestión integral: inventarios, ventas y personal.",
        icon: "Utensils"
    },
    { 
        name: "Punto de Venta (POS)", 
        href: "/punto-de-venta-restaurantes",
        description: "Cobros rápidos y facturación electrónica.",
        icon: "Receipt"
    },
    { 
        name: "Sistema de Delivery", 
        href: "/delivery-para-restaurantes",
        description: "Gestiona tus propios repartidores y pedidos.",
        icon: "Truck"
    },
    { 
        name: "Sistema de Comandas", 
        href: "/sistema-comandas-restaurantes",
        description: "Monitor de cocina (KDS) y comandas digitales.",
        icon: "ChefHat"
    },
];

export const nicheLinks = [
    { 
        name: "Comida Rápida", 
        href: "/software-comida-rapida",
        description: "Pizzerías, hamburgueserías y dark kitchens.",
        icon: "Zap"
    },
    { 
        name: "Bares y Cantinas", 
        href: "/bares",
        description: "Control de botellas, copeo y cuentas abiertas.",
        icon: "Wine"
    },
    { 
        name: "Cafeterías", 
        href: "/cafeterias",
        description: "Atención rápida y gestión de mesa/barra.",
        icon: "Coffee"
    },
    { 
        name: "Restaurante de Espadas", 
        href: "/espadas",
        description: "Servicio de buffet y rotación de personal.",
        icon: "Flame"
    },
    { 
        name: "Pizzerías y Burgers", 
        href: "/software-comida-rapida",
        description: "Venta rápida y gestión de combos.",
        icon: "Pizza"
    },
    { 
        name: "Sushi y Comida Asiática", 
        href: "/software-para-restaurantes",
        description: "Control de insumos frescos y pedidos.",
        icon: "Fish"
    },
];

export const toolLinks = [
    { 
        name: "Menú Digital GRATIS", 
        href: "/menu-digital-gratis",
        description: "Crea tu carta interactiva 100% gratis hoy.",
        icon: "QrCode"
    },
    { 
        name: "Pedidos por WhatsApp", 
        href: "/pedidos-whatsapp",
        description: "Recibe carritos de compra directo en tu chat.",
        icon: "MessageSquare"
    },
    { 
        name: "Generador de Códigos QR", 
        href: "/generador-qr",
        description: "Herramienta gratuita de personalización.",
        icon: "Link"
    },
];

export const exploreLinks = [
    { name: "Directorio Nacional", href: "/menus-digitales", icon: "Search" },
    { name: "Menús en Nuevo León", href: "/menus-digitales/nuevo-leon", icon: "MapPin" },
    { name: "Menús en Chihuahua", href: "/menus-digitales/chihuahua", icon: "MapPin" },
    { name: "Menús en Jalisco", href: "/menus-digitales/jalisco", icon: "MapPin" },
    { name: "Menús en CDMX", href: "/menus-digitales/ciudad-de-mexico", icon: "MapPin" },
    { name: "Mapa del Sitio", href: "/menus-digitales/sitemap", icon: "Map" },
    { name: "Guía de Moteles", href: "/moteles", icon: "Bed" },
];

export const navCategories = [
    {
        title: "Soluciones de Gestión",
        items: platformLinks
    },
    {
        title: "Especialidades",
        items: nicheLinks
    },
    {
        title: "Herramientas de Venta",
        items: toolLinks
    },
    {
        title: "Recursos",
        items: exploreLinks
    }
];