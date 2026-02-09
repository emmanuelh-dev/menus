import axios from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const inflate = promisify(zlib.inflate);

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const API_URL = 'https://api.pidedirecto.mx/pidedirecto/v2/public/getAppContextApi';

const stateMap = [
    { id: 1, names: ['aguascalientes', 'ags'] },
    { id: 2, names: ['baja california', 'bc'] },
    { id: 3, names: ['baja california sur', 'bcs'] },
    { id: 4, names: ['campeche'] },
    { id: 5, names: ['chiapas'] },
    { id: 6, names: ['chihuahua'] },
    { id: 7, names: ['coahuila', 'saltillo', 'torreon'] },
    { id: 8, names: ['colima'] },
    { id: 9, names: ['ciudad de mexico', 'cdmx', 'distrito federal', 'df', 'iztapalapa', 'benito juarez', 'coyoacan', 'milpa alta', 'tlahuac', 'tengo', 'cuajimalpa', 'alvaro obregon', 'venustiano carranza', 'azcapotzalco', 'gustavo a. madero', 'miguel hidalgo', 'cuauhtemoc', 'magdalena contreras', 'xochimilco'] },
    { id: 10, names: ['durango'] },
    { id: 11, names: ['guanajuato', 'leon', 'celaya', 'irapuato'] },
    { id: 12, names: ['guerrero', 'acapulco'] },
    { id: 13, names: ['hidalgo', 'pachuca'] },
    { id: 14, names: ['jalisco', 'guadalajara', 'zapopan', 'tlaquepaque', 'tonala'] },
    { id: 15, names: ['estado de mexico', 'edomex', 'toluca', 'metepec', 'naucalpan', 'tlanepantla', 'ecatepec', 'nezahualcoyotl', 'huixquilucan', 'atizapan', 'cuautitlan', 'chalco', 'ixtapaluca', 'chimalhuacan', 'tecamac'] },
    { id: 16, names: ['michoacan', 'morelia'] },
    { id: 17, names: ['morelos', 'cuernavaca'] },
    { id: 18, names: ['nayarit'] },
    { id: 19, names: ['nuevo leon', 'monterrey', 'mty', 'san nicolas', 'san pedro', 'santa catarina', 'escobedo', 'apodaca', 'guadalupe', 'garcia', 'juarez', 'cadereyta', 'pesqueria', 'concordia'] },
    { id: 20, names: ['oaxaca'] },
    { id: 21, names: ['puebla'] },
    { id: 22, names: ['queretaro', 'qro', 'juriquilla'] },
    { id: 23, names: ['quintana roo', 'cancun', 'playa del carmen'] },
    { id: 24, names: ['san luis potosi', 'slp'] },
    { id: 25, names: ['sinaloa', 'culiacan', 'mazatlan'] },
    { id: 26, names: ['sonora', 'hermosillo'] },
    { id: 27, names: ['tabasco', 'villahermosa'] },
    { id: 28, names: ['tamaulipas', 'reynosa', 'matamoros', 'nuevo laredo', 'tampico'] },
    { id: 29, names: ['tlaxcala'] },
    { id: 30, names: ['veracruz'] },
    { id: 31, names: ['yucatan', 'merida'] },
    { id: 32, names: ['zacatecas'] }
];

function inferState(address, defaultId = 19) {
    if (!address) return defaultId;
    const normalized = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // 1. Nivel de Estado (Abreviaturas y nombres completos) - Prioridad Alta
    if (normalized.includes("ciudad de mexico") || normalized.includes("cdmx") || normalized.includes(" d.f.") || normalized.includes(" df ") || normalized.includes("mexico d.f")) return 9;
    if (normalized.includes("estado de mexico") || normalized.includes("edomex") || normalized.includes("edo de mexico") || normalized.includes("edo. de mexico") || normalized.includes(", mex.") || normalized.includes(" edo mex")) return 15;
    if (normalized.includes("nuevo leon") || normalized.includes(" n.l.") || normalized.includes(" nl ") || normalized.includes(", n.l")) return 19;
    if (normalized.includes("queretaro") || normalized.includes(" qro")) return 22;
    if (normalized.includes(" jalisco") || normalized.includes(" jal.")) return 14;
    if (normalized.includes(" coahuila") || normalized.includes(" coah.")) return 7;
    if (normalized.includes(" guanajuato") || normalized.includes(" gto.")) return 11;

    // 2. Nivel de Municipio/Ciudad - Prioridad Media (Solo si no hay pista de estado arriba)
    if (normalized.includes("monterrey") || normalized.includes("san pedro garza") || (normalized.includes("santa catarina") && normalized.includes("n.l")) || normalized.includes("apodaca") || normalized.includes("san nicolas") || normalized.includes("guadalupe, nl") || normalized.includes("escobedo")) return 19;
    if (normalized.includes("iztapalapa") || normalized.includes("magdalena contreras") || normalized.includes("cuauhtemoc") || normalized.includes("benito juarez") || normalized.includes("coyoacan") || normalized.includes("tlahuac") || normalized.includes("azcapotzalco") || normalized.includes("lindavista") || normalized.includes("lomas estrella") || normalized.includes("condesa") || normalized.includes("xochimilco") || normalized.includes("tulyehualco") || normalized.includes("zapotitlan") || normalized.includes("revolucion") || normalized.includes("narvarte") || normalized.includes("insurgentes") || normalized.includes("roma norte") || normalized.includes("roma sur") || normalized.includes("polanco")) return 9;
    if (normalized.includes("toluca") || normalized.includes("metepec") || normalized.includes("naucalpan") || normalized.includes("tlanepantla") || normalized.includes("ecatepec") || normalized.includes("nezahualcoyotl") || normalized.includes("tecamac") || normalized.includes("huixquilucan") || normalized.includes("cosmopol") || normalized.includes("xalostoc") || normalized.includes("ixtapaluca") || normalized.includes("coacalco") || normalized.includes("cuautitlan")) return 15;
    if (normalized.includes("juriquilla") || normalized.includes("corregidora")) return 22;
    if (normalized.includes("saltillo") || normalized.includes("torreon")) return 7;
    if (normalized.includes("guadalajara") || normalized.includes("zapopan") || normalized.includes("tlaquepaque")) return 14;
    if (normalized.includes("puebla")) return 21;
    if (normalized.includes("leon, gto") || normalized.includes("irapuato") || normalized.includes("celaya")) return 11;
    if (normalized.includes("aguascalientes")) return 1;

    // 3. Palabra clave general del mapa (última opción)
    for (const state of stateMap) {
        if ([19, 9, 15, 22, 7, 14, 21, 11, 1].includes(state.id)) continue;
        for (const name of state.names) {
            if (normalized.includes(name)) {
                const regex = new RegExp(`(?:calle|av|blvd|calz|rio|jose|callejón)\\s+${name}`, 'i');
                if (!regex.test(normalized)) return state.id;
            }
        }
    }
    
    return defaultId;
}

/**
 * Scraper para pidedirecto.mx (plataforma Ambit/Wansoft)
 */
export async function scrapePideDirecto(subdomain, pathname = '', state_id = null) {


  try {
    console.log(`[START] Scrapeando: ${subdomain}.pidedirecto.mx/${pathname || 'root'}...`);
    
    const response = await axios.post(API_URL, {
      urlSubdomain: subdomain,
      urlPathname: pathname
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const data = response.data;
    const potentialEncoded = typeof data === 'string' ? data : (data.appContext || null);

    if (!potentialEncoded || !potentialEncoded.startsWith('eJz')) {
      console.error(`[ERROR] No se pudo obtener datos válidos para ${subdomain}/${pathname}`);
      return null;
    }

    const buffer = Buffer.from(potentialEncoded, 'base64');
    const decompressed = await inflate(buffer);
    const json = JSON.parse(decompressed.toString());

    // Si no se especificó un pathname y hay múltiples sucursales
    if (!pathname && json.restaurants && json.restaurants.length > 0) {
      if (json.restaurants.length > 1) {
        console.log(`[INFO] Se encontraron ${json.restaurants.length} sucursales para ${subdomain}.`);
        return { type: 'branch_list', branches: json.restaurants.map(r => r.urlPathname) };
      } else {
        // Solo hay una sucursal, la usamos
        const singlePath = json.restaurants[0].urlPathname;
        console.log(`[INFO] Navegando a sucursal única: ${singlePath}`);
        return scrapePideDirecto(subdomain, singlePath, state_id);
      }
    }

    // Extraer datos del restaurante
    const restaurant = json.restaurants?.find(r => r.urlPathname === pathname) || json.restaurants?.[0];
    if (!restaurant) {
      console.error(`[ERROR] Restaurante no encontrado en el JSON`);
      return null;
    }

    const restaurantName = restaurant.name;
    
    // Generar short_name basado en el nombre completo (que suele incluir la sucursal)
    // Ejemplo: "Pollo Maton Aztlan" -> "pollo-maton-aztlan"
    let shortName = restaurantName.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Si el nombre es muy corto o genérico, asegurar unicidad con el subdomain/pathname
    if (shortName.length < 5 || !shortName.includes(subdomain.toLowerCase().substring(0, 3))) {
        shortName = `${subdomain}-${pathname || 'main'}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }

    
    // Extraer menú
    const blocks = [];
    const menus = json.restaurantMenu?.menus || [];
    
    for (const menu of menus) {
      for (const category of (menu.categories || [])) {
        const categoryName = category.name;
        const itemsList = category.products || category.menuItems || [];
        
        const items = itemsList.map(item => ({
          id: uuidv4(),
          name: item.name,
          price: item.price || 0,
          description: item.description || "",
          image: item.imageUrl || "",
          available: !item.outOfStock && !item.temporarilyOffline
        }));

        if (items.length > 0) {
          blocks.push({
            id: uuidv4(),
            type: 'section',
            data: {
              title: categoryName.toUpperCase(),
              items: items
            }
          });
        }
      }
    }

    if (blocks.length === 0) {
      console.log(`[SKIP] No se encontraron artículos de menú para ${restaurantName}`);
      return null;
    }

    // Imagen destacada
    const featuredImage = restaurant.imageUrl || json.restaurantChain?.imageUrl || "";

    const content = {
      blocks,
      semantic_data: {
        description: `Menú de ${restaurantName}. Precios actualizados.`,
        price_range: "$$",
        cuisine_type: "Restaurante",
        address: `${restaurant.street || ''}${typeof restaurant.location === 'string' ? ', ' + restaurant.location : ''}`.trim() || 'México',
        phone: restaurant.phoneNumber

      },
      view_settings: {
        layout: 'list',
        show_prices: true
      }
    };

    const finalStateId = state_id || inferState(content.semantic_data.address);

    const placeData = {
      name: restaurantName,
      short_name: shortName,
      type: 'restaurant',
      content: content,
      featured: false,
      rating: 4.5,
      priceRange: "$$",
      address: content.semantic_data.address,
      state_id: finalStateId, 
      image: featuredImage
    };


    console.log(`[OK] Procesado: ${restaurantName} (${shortName})`);

    // Verificar si ya existe para evitar duplicados y permitir "resume"
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('short_name', shortName)
      .maybeSingle();

    if (existing) {
      console.log(`[SKIP] El short_name "${shortName}" ya existe en Supabase. Saltando...`);
      return { type: 'skipped', shortName };
    }

    // Upsert a Supabase (aunque preferimos insert si estamos seguros que no existe, upsert es más seguro)
    const result = await supabase
      .from('places')
      .insert([placeData]);


    if (result.error) {
      console.error(`[ERROR] Supabase (${shortName}):`, result.error.message);
    } else {
      console.log(`[SUCCESS] Supabase (${shortName})`);
    }

    return content;
  } catch (error) {
    console.error(`[FATAL] ${subdomain}/${pathname}:`, error.message);
    return null;
  }
}

// CLI check
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    const subdomain = process.argv[2];
    const pathname = process.argv[3] || '';
    const stateIdStr = process.argv[4] || '19'; // 19 = Nuevo Leon
    const stateId = parseInt(stateIdStr);

    
    if (subdomain) {
        scrapePideDirecto(subdomain, pathname, stateId).then(result => {
            if (result && result.type === 'branch_list') {
                console.log('Procesando sucursales...');
                const processBranches = async () => {
                    for (const branch of result.branches) {
                        await scrapePideDirecto(subdomain, branch, stateId);
                        await new Promise(r => setTimeout(r, 1000));
                    }
                };

                processBranches().then(() => process.exit(0));
            } else {
                process.exit(0);
            }
        });
    } else {
        console.log('Uso: node scripts/scrape-pidedirecto.js <subdomain> [pathname]');
        console.log('Ejemplo: node scripts/scrape-pidedirecto.js pollomaton aztlan');
    }
}
