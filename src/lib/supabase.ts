import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-public-key'
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export const getSupabaseConnectionStatus = () => {
  if (!supabaseUrl || supabaseUrl === 'https://your-project.supabase.co') {
    return {
      status: 'demo_mode',
      message: 'Modo SQL Local Ativo (Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para conexão remota)',
      url: supabaseUrl || 'Não configurado',
    };
  }
  return {
    status: 'connected',
    message: 'Supabase configurado com sucesso',
    url: supabaseUrl,
  };
};
