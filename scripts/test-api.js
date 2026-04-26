const { createClient } = require('@supabase/supabase-js');

async function test() {
  const url = 'https://hcouuakjmetkdridinje.supabase.co';
  const key = 'sb_publishable_J8Zj2Aibw98cWUOehxiugw_vZspl2fH'; // Note: User provided this, but wait, this looks like a publishable key, not the anon key.
  
  const supabase = createClient(url, key);
  
  const { data, error } = await supabase.from('todos').select('*').limit(1);
  
  if (error) {
    console.error('API Error:', error.message);
  } else {
    console.log('API Success! Data:', data);
  }
}

test();
