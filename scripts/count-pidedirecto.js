import axios from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';

const inflate = promisify(zlib.inflate);
const API_URL = 'https://api.pidedirecto.mx/pidedirecto/v2/public/getAppContextApi';

const subdomains = [
    'lafogata',
    'donpizza',
    'hogaburgers',
    'pollomaton',
    'lapecera',
    'deliciasdelcontrysaltillo',
    'chickenwestern',
    'puntovenezolano',
    'tienda',
    'tallerveganico'
];

async function countBranches(subdomain) {
    try {
        const response = await axios.post(API_URL, {
            urlSubdomain: subdomain,
            urlPathname: ''
        }, { timeout: 5000 });

        const potentialEncoded = typeof response.data === 'string' ? response.data : (response.data.appContext || null);
        if (potentialEncoded && potentialEncoded.startsWith('eJz')) {
            const buffer = Buffer.from(potentialEncoded, 'base64');
            const decompressed = await inflate(buffer);
            const json = JSON.parse(decompressed.toString());
            return json.restaurants ? json.restaurants.length : 0;
        }
        return 1;
    } catch (e) {
        return 0;
    }
}

async function start() {
    let total = 0;
    console.log('--- Conteo de Sucursales ---');
    for (const s of subdomains) {
        const count = await countBranches(s);
        console.log(`${s}: ${count} sucursales`);
        total += count;
    }
    console.log(`\nTotal aproximado de peticiones: ${total}`);
    console.log(`Tiempo estimado (2s por suc): ${Math.round((total * 2) / 60)} minutos`);
}

start();
