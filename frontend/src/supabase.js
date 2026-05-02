import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://ksabwaquzihgyzongjof.supabase.co';
const SUPABASE_ANON = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzYWJ3YXF1emloZ3l6b25nam9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3Mzc3OTMsImV4cCI6MjA5MzMxMzc5M30.e4ctUZ3GKdHpRIo8rBJS90__bPuqVmog-RH-dXBn1fI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
