import { createAdminClient } from './src/lib/supabase/server';

async function checkColumns() {
  const supabase = await createAdminClient();
  const { data, error } = await supabase.from('import_logs').select('*').limit(1).single();
  if (data) console.log('Columns:', Object.keys(data));
  else console.log('Error:', error);
}

checkColumns();
