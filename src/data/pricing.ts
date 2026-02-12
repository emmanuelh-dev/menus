export interface ComparativeFeature {
  name: string;
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

export const publicPlans: PublicPlan[] = [
  {
    id: 'free',
    name: 'Plan Gratis',
    fromLabel: 'DESDE',
    headline: '$0',
    description: 'Abre tu tienda online en minutos y recibe pedidos ilimitados por WhatsApp.',
    note: 'Ideal para empezar sin costo ni tarjetas de crédito.',
    ctaLabel: 'Crear cuenta gratis',
    ctaHref: '/admin/register',
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    fromLabel: 'DESDE',
    headline: 'Cotización',
    description: 'Ahorra tiempo administrando productos, precios y flujo de pedidos en un solo panel.',
    note: 'Incluye soporte prioritario y herramientas avanzadas.',
    ctaLabel: 'Solicitar plan Pro',
    ctaHref: '/admin/register',
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    fromLabel: 'DESDE',
    headline: 'Cotización',
    description: 'Escala con personalización, integraciones y soporte dedicado para operaciones grandes.',
    note: 'Recomendado para cadenas, franquicias y equipos de alto volumen.',
    ctaLabel: 'Hablar con ventas',
    ctaHref: '/admin/register',
  },
];
