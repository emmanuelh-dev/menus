import { scrapePideDirecto } from './scrape-pidedirecto.js';

const subdomainsArg = process.argv.slice(2);
const subdomains = subdomainsArg.length > 0 ? subdomainsArg : [
    'lafogata', 'donpizza', 'hogaburgers', 'pollomaton', 'lapecera', 
    'deliciasdelcontrysaltillo', 'chickenwestern', 'puntovenezolano', 'tienda', 'tallerveganico',
    'dumbopizza', 'lasedemasamadre', 'niupipizza', 'lpqtp', 'lasalitas', 
    'laspaulinas', 'lachinacochina', 'lacazuela', 'hokkaido', 'chilaquilesmxlasaltena',
    'cafecacao', 'romeospizza', 'saborypico', 'boyzburger', 'oxxidowings', 
    'platoexpress', 'smokesbbq', 'elpunto', 'michelab', 'milanga', 
    'ramenandpokes', 'pizzeriajhonnys', 'pizzaburger', 'johnhamsmenu', 'weloveburgers', 
    'tera', 'elreydelchivito', 'quesadillasventura', 'yosposchicken', 'todoempanadas', 
    'pizzauy', 'thefoodbox', 'tacoscarbones', 'delpacificomarket', 'spikes', 
    'laspeggies', 'elreyburgersandfries'
];



async function main() {
    console.log(`=== Iniciando Scraping Masivo de PideDirecto (${subdomains.length} plataformas) ===\n`);
    
    for (const subdomain of subdomains) {
        console.log(`\n--- Procesando: ${subdomain} ---`);
        try {
            const result = await scrapePideDirecto(subdomain, '');
            if (result && result.type === 'branch_list') {
                console.log(`Procesando ${result.branches.length} sucursales para ${subdomain}...`);
                // Procesar solo las primeras 5 sucursales para no saturar si es muy grande, 
                // o todas si el usuario lo prefiere. Por seguridad procesaremos todas en lotes.
                const branches = result.branches;
                for (const branch of branches) {
                    await scrapePideDirecto(subdomain, branch);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        } catch (error) {
            console.error(`Error procesando ${subdomain}:`, error.message);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log(`\n=== Scraping Masivo Finalizado ===`);
}

main().catch(console.error);
