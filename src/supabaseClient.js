import { createClient } from '@supabase/supabase-js';

// החלף את הערכים האלו במפתחות האמיתיים שלך מ-Supabase
const supabaseUrl = 'https://pkzmjvulsjpkcibxxyoc.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrem1qdnVsc2pwa2NpYnh4eW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4ODc2NjksImV4cCI6MjA4MzQ2MzY2OX0.cZ4800B0r8gWFMpjd7oFq7a_YVF3YsrVrdzriifwp2U';

export const supabase = createClient(supabaseUrl, supabaseKey);