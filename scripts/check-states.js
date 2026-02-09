import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStates() {
    const { data, error } = await supabase.from('states').select('id, name, slug');
    if (error) console.error(error);
    else console.log(JSON.stringify(data, null, 2));
}

checkStates();
