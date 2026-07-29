export interface ComparativeFeature {
  name: string;
  /** La columna de la prueba. Se sigue llamando `free` por el codigo que ya la
   *  lee; lo que muestra es lo que incluye el periodo de prueba. */
  free: string;
  pro: string;
  enterprise: string;
}

export interface PublicPlan {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  fromLabel: string;
  headline: string;
  description: string;
  note: string;
  ctaLabel: string;
  ctaHref: string;
}

export const comparativeFeatures: ComparativeFeature[] = [
  {
    name: 'Menú digital',
    free: 'Básico',
    pro: 'Avanzado',
    enterprise: 'Personalizado',
  },
  {
    name: 'Productos',
    free: 'Ilimitados',
    pro: 'Ilimitados',
    enterprise: 'Ilimitados',
  },
  {
    name: 'Soporte',
    free: 'Sin soporte',
    pro: 'Prioritario',
    enterprise: 'Dedicado 24/7',
  },
  { name: 'Dominio propio', free: 'No', pro: 'Sí', enterprise: 'Sí' },
  { name: 'Análisis de popularidad', free: 'No', pro: 'Sí', enterprise: 'Sí' },
  { name: 'Diseño personalizado', free: 'No', pro: 'No', enterprise: 'Sí' },
  {
    name: 'Fotografía profesional',
    free: 'No',
    pro: 'No',
    enterprise: '20 platillos',
  },
  {
    name: 'Segmentación por sucursal',
    free: 'No',
    pro: 'No',
    enterprise: 'Sí',
  },
  { name: 'Integración POS', free: 'No', pro: 'No', enterprise: 'Sí' },
  { name: 'API personalizada', free: 'No', pro: 'No', enterprise: 'Sí' },
  { name: 'Solicitud de funciones', free: 'No', pro: 'No', enterprise: 'Sí' },
];

// El plan de $0 permanente se convirtio en prueba con fecha. Un plan gratis
// para siempre le enseña al cliente que el producto no cuesta, y despues hay
// que desdecirse para cobrarle. La prueba dice lo contrario: esto vale, pruebalo
// antes de pagar.
//
// Los 14 dias son el estandar de la categoria y estan en un solo lugar a
// proposito: si se cambia el numero, se cambia aqui.
export const DIAS_DE_PRUEBA = 14;

export const publicPlans: PublicPlan[] = [
  {
    id: 'free',
    name: 'Prueba',
    fromLabel: 'PRIMEROS',
    headline: `${DIAS_DE_PRUEBA} días`,
    description: 'Monta tu menú, publica tu QR y recibe pedidos por WhatsApp para ver cómo se comporta con tus clientes reales.',
    note: 'Sin tarjeta para empezar. Al terminar eliges plan.',
    ctaLabel: 'Empezar la prueba',
    ctaHref: 'https://admin-menus.bysmax.com',
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    fromLabel: 'DESDE',
    headline: 'Cotización',
    description: 'Tu menú, tus pedidos y tus precios en un solo panel, con dominio propio y soporte prioritario.',
    note: 'Sin comisión por pedido: pagas la herramienta, no un porcentaje de lo que vendes.',
    ctaLabel: 'Solicitar plan Pro',
    ctaHref: 'https://admin-menus.bysmax.com',
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    fromLabel: 'DESDE',
    headline: 'Cotización',
    description: 'Escala con personalización, integraciones y soporte dedicado para operaciones grandes.',
    note: 'Recomendado para cadenas, franquicias y equipos de alto volumen.',
    ctaLabel: 'Hablar con ventas',
    ctaHref: 'https://admin-menus.bysmax.com',
  },
];
