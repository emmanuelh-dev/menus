import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const stateMap = [
    { id: 1, names: ['aguascalientes', 'ags'] },
    { id: 2, names: ['baja california', 'bc'] },
    { id: 3, names: ['baja california sur', 'bcs'] },
    { id: 4, names: ['campeche'] },
    { id: 5, names: ['chiapas'] },
    { id: 6, names: ['chihuahua', 'chih'] },
    { id: 7, names: ['coahuila', 'saltillo', 'torreon', 'coah'] },
    { id: 8, names: ['colima'] },
    { id: 9, names: ['ciudad de mexico', 'cdmx', 'distrito federal', 'df', 'mexico df', 'mexico d.f.', 'iztapalapa', 'benito juarez', 'coyoacan', 'milpa alta', 'tlahuac', 'cuajimalpa', 'alvaro obregon', 'venustiano carranza', 'azcapotzalco', 'gustavo a. madero', 'miguel hidalgo', 'cuauhtemoc', 'magdalena contreras', 'xochimilco'] },
    { id: 10, names: ['durango'] },
    { id: 11, names: ['guanajuato', 'leon', 'celaya', 'irapuato', 'gto'] },
    { id: 12, names: ['guerrero', 'acapulco'] },
    { id: 13, names: ['hidalgo', 'pachuca'] },
    { id: 14, names: ['jalisco', 'guadalajara', 'zapopan', 'tlaquepaque', 'tonala', 'jal'] },
    { id: 15, names: ['estado de mexico', 'edomex', 'edo. de mexico', 'edo de mexico', 'toluca', 'metepec', 'naucalpan', 'tlanepantla', 'ecatepec', 'nezahualcoyotl', 'huixquilucan', 'atizapan', 'cuautitlan', 'chalco', 'ixtapaluca', 'chimalhuacan', 'tecamac', 'mex.'] },
    { id: 16, names: ['michoacan', 'morelia'] },
    { id: 17, names: ['morelos', 'cuernavaca'] },
    { id: 18, names: ['nayarit'] },
    { id: 19, names: ['nuevo leon', 'monterrey', 'mty', 'n.l.', 'san nicolas', 'san pedro', 'santa catarina', 'escobedo', 'apodaca', 'guadalupe', 'garcia', 'juarez', 'cadereyta', 'pesqueria', 'concordia'] },
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

async function reclassify() {
    console.log('--- Iniciando Reclasificación de Estados ---');
    
    const { data: places, error } = await supabase
        .from('places')
        .select('id, name, address, state_id');
        
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Encontrados ${places.length} lugares.`);
    
    let updatedCount = 0;
    for (const place of places) {
        // Intentamos inferir por dirección rimero, luego por nombre
        let newStateId = inferState(place.address, null);
        
        // Si no se pudo por dirección, probamos por nombre
        if (newStateId === null) {
            newStateId = inferState(place.name, place.state_id);
        }
        
        if (newStateId !== place.state_id) {
            console.log(`Actualizando [${place.name}]: ${place.state_id} -> ${newStateId}`);
            const { error: updateError } = await supabase
                .from('places')
                .update({ state_id: newStateId })
                .eq('id', place.id);
                
            if (updateError) {
                console.error(`Error actualizando ${place.name}:`, updateError.message);
            } else {
                updatedCount++;
            }
        }
    }
    
    console.log(`--- Reclasificación Finalizada. ${updatedCount} registros actualizados. ---`);
}

reclassify();
