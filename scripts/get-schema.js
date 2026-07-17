import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const { data, error } = await supabase.from('places').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns in places table:');
    if (data.length > 0) {
      console.log(Object.keys(data[0]));
    } else {
      console.log('Table is empty, trying pg_meta if possible or inserting a mock row to get schema...');
      try {
        const { data: cols } = await supabase.rpc('query_schema', { table_name: 'places' });
        console.log('Cols:', cols);
      } catch (e) {
        console.log('Could not get cols via rpc.');
      }
    }
  }
}

main();
