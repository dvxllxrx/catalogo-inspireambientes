import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://txutggwgxujkushnnuyc.supabase.co'
const supabaseKey = 'sb_publishable_YnY2EUmliQVN0Cr1utovCg_BPuXcZX_'

export const supabase = createClient(supabaseUrl, supabaseKey)