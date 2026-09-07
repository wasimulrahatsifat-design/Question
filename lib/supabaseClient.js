import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL_KEY = 'exam_app_supabase_url';
const SUPABASE_ANON_KEY_KEY = 'exam_app_supabase_anon_key';

/**
 * Get current Supabase credentials (from environment or localStorage)
 */
export function getSupabaseCredentials() {
  if (typeof window === 'undefined') {
    return {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      isEnv: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    };
  }

  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (envUrl && envKey) {
    return { url: envUrl, anonKey: envKey, isEnv: true };
  }

  const localUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
  const localKey = localStorage.getItem(SUPABASE_ANON_KEY_KEY) || '';

  return {
    url: localUrl,
    anonKey: localKey,
    isEnv: false,
  };
}

/**
 * Save custom Supabase credentials to localStorage
 */
export function saveSupabaseCredentials(url, anonKey) {
  if (typeof window === 'undefined') return;
  if (url && anonKey) {
    localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    localStorage.setItem(SUPABASE_ANON_KEY_KEY, anonKey.trim());
  } else {
    localStorage.removeItem(SUPABASE_URL_KEY);
    localStorage.removeItem(SUPABASE_ANON_KEY_KEY);
  }
}

let cachedClient = null;
let cachedKey = '';

/**
 * Get Supabase Client Instance (or null if unconfigured)
 */
export function getSupabase() {
  const { url, anonKey } = getSupabaseCredentials();
  if (!url || !anonKey) return null;

  const currentKey = `${url}_${anonKey}`;
  if (cachedClient && cachedKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
    });
    cachedKey = currentKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

/**
 * Test Supabase connection and check/ensure bucket existence
 */
export async function testSupabaseConnection(customUrl, customKey) {
  try {
    const url = customUrl || getSupabaseCredentials().url;
    const anonKey = customKey || getSupabaseCredentials().anonKey;

    if (!url || !anonKey) {
      return { success: false, message: 'Supabase URL এবং Anon Key দেওয়া হয়নি।' };
    }

    const client = createClient(url, anonKey, { auth: { persistSession: false } });

    // Test bucket access
    const { data: buckets, error: bucketErr } = await client.storage.listBuckets();
    if (bucketErr) {
      return {
        success: false,
        message: `Supabase কানেকশন ত্রুটি: ${bucketErr.message}`,
      };
    }

    const hasSourcesBucket = buckets && buckets.some((b) => b.name === 'exam_sources' || b.name === 'exam-sources');

    return {
      success: true,
      message: 'Supabase সফলভাবে সংযুক্ত হয়েছে!',
      buckets: buckets ? buckets.map((b) => b.name) : [],
      hasSourcesBucket,
    };
  } catch (err) {
    return {
      success: false,
      message: `কানেকশন ব্যর্থ: ${err.message || 'অজানা ত্রুটি'}`,
    };
  }
}

export const SUPABASE_SQL_SETUP = `-- Supabase SQL Editor এ এই সম্পূর্ণ কোডটি রান করুন:

-- ১. সোর্স ও বই মেটাডাটা টেবিল তৈরি করুন
CREATE TABLE IF NOT EXISTS public.exam_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_url TEXT,
    public_url TEXT,
    provider TEXT DEFAULT 'supabase', -- 'supabase' বা 'uploadthing'
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    type TEXT NOT NULL, -- 'pdf', 'image', 'text'
    file_name TEXT,
    file_path TEXT,
    text_content TEXT,
    page_count INTEGER DEFAULT 1,
    size_bytes BIGINT DEFAULT 0,
    chapters JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- পূর্বের তৈরি টেবিল থাকলে কলামগুলো নিশ্চিত করুন
ALTER TABLE public.exam_sources ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.exam_sources ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE public.exam_sources ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'supabase';
ALTER TABLE public.exam_sources ADD COLUMN IF NOT EXISTS chapters JSONB DEFAULT '[]'::jsonb;

-- ঐচ্ছিক books টেবিল (সরাসরি বুকস কুয়েরির জন্য)
CREATE TABLE IF NOT EXISTS public.books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'supabase' or 'uploadthing'
    class_name TEXT,
    subject TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ২. পাবলিক এক্সেস পলিসি এনাবল করুন
ALTER TABLE public.exam_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access" ON public.exam_sources;
DROP POLICY IF EXISTS "Allow public insert access" ON public.exam_sources;
DROP POLICY IF EXISTS "Allow public update access" ON public.exam_sources;
DROP POLICY IF EXISTS "Allow public delete access" ON public.exam_sources;

CREATE POLICY "Allow public read access" 
ON public.exam_sources FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" 
ON public.exam_sources FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.exam_sources FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access" 
ON public.exam_sources FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow public read books" ON public.books;
DROP POLICY IF EXISTS "Allow public insert books" ON public.books;
DROP POLICY IF EXISTS "Allow public update books" ON public.books;
DROP POLICY IF EXISTS "Allow public delete books" ON public.books;

CREATE POLICY "Allow public read books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Allow public insert books" ON public.books FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update books" ON public.books FOR UPDATE USING (true);
CREATE POLICY "Allow public delete books" ON public.books FOR DELETE USING (true);

-- ৩. Storage বাকেট তৈরি ও পারমিশন নিশ্চিতকরণ
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam_sources', 'exam_sources', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow public storage upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage select" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage update" ON storage.objects;
DROP POLICY IF EXISTS "Allow public storage delete" ON storage.objects;

CREATE POLICY "Allow public storage upload" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exam_sources');

CREATE POLICY "Allow public storage select" 
ON storage.objects FOR SELECT USING (bucket_id = 'exam_sources');

CREATE POLICY "Allow public storage update" 
ON storage.objects FOR UPDATE USING (bucket_id = 'exam_sources');

CREATE POLICY "Allow public storage delete" 
ON storage.objects FOR DELETE USING (bucket_id = 'exam_sources');
`;


