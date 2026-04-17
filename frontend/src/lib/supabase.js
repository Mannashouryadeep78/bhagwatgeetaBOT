import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://izqcpfznbjeeyklhzjsq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cWNwZnpuYmplZXlrbGh6anNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzUwMjEsImV4cCI6MjA5MTg1MTAyMX0.CtxsY2FeiBu5NgcX5CQVqP_05m-40SELpCSXY1gpdF4'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
