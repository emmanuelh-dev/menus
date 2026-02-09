import axios from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';

const inflate = promisify(zlib.inflate);

async function debug(subdomain, path = '') {
  try {
    const response = await axios.post('https://api.pidedirecto.mx/pidedirecto/v2/public/getAppContextApi', {
      urlSubdomain: subdomain,
      urlPathname: path
    });
    console.log('Keys:', Object.keys(response.data));
    const potentialEncoded = response.data.appContext || response.data;
    if (typeof potentialEncoded !== 'string') {
        console.log('is not string, type:', typeof potentialEncoded);
        return;
    }
    const buffer = Buffer.from(potentialEncoded, 'base64');
    const decompressed = await inflate(buffer);
    const json = JSON.parse(decompressed.toString());
    const r = json.restaurants[0];
    console.log('Restaurant Name:', r.name);
    console.log('Street:', r.street, 'Type:', typeof r.street);
    console.log('Location:', r.location, 'Type:', typeof r.location);
  } catch (e) {
    console.error(e);
  }
}

debug('lasalitas', 'lomas-estrella');
