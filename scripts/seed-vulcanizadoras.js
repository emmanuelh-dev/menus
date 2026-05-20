import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar .env de la raíz
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase variables in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function main() {
  const filePath = path.join(__dirname, 'data/vulcanizadoras_monterrey.json');
  let data = [];
  
  try {
      const rawData = await fs.readFile(filePath, 'utf-8');
      data = JSON.parse(rawData);
  } catch (err) {
      console.error(`Error loading JSON file: ${err.message}`);
      process.exit(1);
  }
  
  // 1. Fetch state_id and municipality_id for Monterrey, Nuevo Leon
  const { data: estadoData } = await supabase.from('states').select('id').eq('slug', 'nuevo-leon').single();
  const state_id = estadoData?.id || 19;
  
  const { data: munData } = await supabase.from('municipalities').select('id').eq('slug', 'monterrey').single();
  const municipality_id = munData?.id || null;
  
  let successful = 0;
  let failed = 0;

  console.log(`🚀 Iniciando inserción/upsert de ${data.length} registros (state_id: ${state_id}, municipality_id: ${municipality_id})...`);

  for (const item of data) {
    const short_name = slugify(item.name);
    
    const record = {
      name: item.name,
      short_name,
      type: 'vulcanizadora',
      category: 'vulcanizadoras',
      rating: parseFloat(item.rating || 0) || 0,
      priceRange: "$",
      image: item.image,
      address: item.address,
      formatted_address: item.address,
      hours: Array.isArray(item.hours) ? item.hours.join(', ') : '',
      content: item.content,
      featured: false,
      state_id,
      municipality_id
    };

    // Consultamos si ya existe
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('short_name', short_name)
      .eq('type', 'vulcanizadora')
      .maybeSingle();

    let result;
    if (existing) {
       result = await supabase.from('places').update(record).eq('id', existing.id);
    } else {
       result = await supabase.from('places').insert(record);
    }

    if (result.error) {
       console.error(`❌ Error con ${item.name}:`, result.error.message);
       failed++;
    } else {
       console.log(`✅ Ok: ${item.name} -> (/${short_name})`);
       successful++;
       
       // Handle many-to-many place_municipalities if the table existed. 
       // Since it didn't exist yet, we only set it in the parent `municipality_id`
    }
  }

  console.log(`\n🎉 Completado. Exitosos: ${successful}, Fallidos: ${failed}`);
}

main();