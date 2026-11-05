import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://chohswyxsckpwyzlbzav.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNob2hzd3l4c2NrcHd5emxiemF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM0MzU0NDIsImV4cCI6MjEwOTAxMTQ0Mn0.DLuDDy5khFJUsYnixHfy6sdJoNB00EUk68pRWnnFRVA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  skills: string[] | null;
  location: string | null;
};

export type PostRow = {
  id: string;
  author_id: string;
  content: string;
  media_url: string | null;
  media_type?: string | null;
  category?: string | null;
  created_at: string;
  profiles?: Profile | null;
};
