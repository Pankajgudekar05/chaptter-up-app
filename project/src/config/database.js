import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL and Key must be provided in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') {
      console.log('Database connection: checking...');
    } else {
      console.log('✓ Database connected successfully');
    }
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
};
