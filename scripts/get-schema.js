import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ncennxosjocsngjyevpx.supabase.co'\;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZW5ueG9zam9jc25nanlldnB4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzk1NjA2OSwiZXhwIjoyMDUzNTMyMDY5fQ.9DzxzmBbBxS5_UQbm2LvYECM08_0lPUnpVq8Hh7BCuk';

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
