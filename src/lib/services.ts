/**
 * Diccionario de mapeo de servicios locales.
 * Mapea el slug plural de la URL al tipo singular usado en la base de datos de Supabase.
 */
export const SERVICES_MAP: Record<string, string> = {
  'vulcanizadoras': 'vulcanizadora',
  'vulka-movil': 'vulka_movil',
  'plomeros': 'plomero',
  'electricistas': 'electricista',
  'cerrajeros': 'cerrajero',
  'carpinteros': 'carpintero',
  'pintores': 'pintor',
  'jardineros': 'jardinero',
};

// Generar el mapa inverso de singular a plural
export const SERVICES_SINGULAR_TO_PLURAL: Record<string, string> = Object.fromEntries(
  Object.entries(SERVICES_MAP).map(([plural, singular]) => [singular, plural])
);

/**
 * Obtiene el tipo singular (BD) a partir del slug plural de URL.
 */
export function getServiceTypeFromSlug(slug: string): string | null {
  if (!slug) return null;
  return SERVICES_MAP[slug.toLowerCase()] || null;
}

/**
 * Obtiene el slug de URL (plural) a partir del tipo singular de base de datos.
 */
export function getSlugFromServiceType(type: string): string {
  if (!type) return '';
  return SERVICES_SINGULAR_TO_PLURAL[type.toLowerCase()] || `${type}s`;
}

/**
 * Obtiene el título en singular con mayúscula inicial (ej: "vulcanizadora" -> "Vulcanizadora").
 */
export function getServiceTitle(type: string): string {
  if (!type) return '';
  const titles: Record<string, string> = {
    'vulcanizadora': 'Vulcanizadora',
    'vulka_movil': 'Vulcanizadora Móvil',
    'plomero': 'Plomero',
    'electricista': 'Electricista',
    'cerrajero': 'Cerrajero',
    'carpintero': 'Carpintero',
    'pintor': 'Pintor',
    'jardinero': 'Jardinero',
  };
  const normalized = type.toLowerCase();
  return titles[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Obtiene el título en plural con mayúscula inicial (ej: "vulcanizadora" -> "Vulcanizadoras").
 */
export function getServiceTitlePlural(type: string): string {
  if (!type) return '';
  const titlesPlural: Record<string, string> = {
    'vulcanizadora': 'Vulcanizadoras',
    'vulka_movil': 'Vulcanizadoras Móviles',
    'plomero': 'Plomeros',
    'electricista': 'Electricistas',
    'cerrajero': 'Cerrajeros',
    'carpintero': 'Carpinteros',
    'pintor': 'Pintores',
    'jardinero': 'Jardineros',
  };
  const normalized = type.toLowerCase();
  if (titlesPlural[normalized]) return titlesPlural[normalized];
  
  // Pluralización simple fallback
  const singular = getServiceTitle(type);
  if (singular.endsWith('r') || singular.endsWith('s') || singular.endsWith('n') || singular.endsWith('l')) {
    return `${singular}es`;
  }
  return `${singular}s`;
}

/**
 * Obtiene el emoji correspondiente para el tipo de servicio.
 */
export function getServiceEmoji(type: string): string {
  const emojis: Record<string, string> = {
    'vulcanizadora': '🔧',
    'vulka_movil': '🚚',
    'plomero': '🪠',
    'electricista': '⚡',
    'cerrajero': '🔑',
    'carpintero': '🪚',
    'pintor': '🎨',
    'jardinero': '🌱',
  };
  return emojis[type.toLowerCase()] || '🛠️';
}

/**
 * Retorna todos los servicios soportados actualmente.
 */
export function getAvailableServices() {
  return Object.entries(SERVICES_MAP).map(([slug, type]) => ({
    slug,
    type,
    title: getServiceTitlePlural(type),
    emoji: getServiceEmoji(type),
  }));
}
