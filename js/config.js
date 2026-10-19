/*
 * Optional: connect a free Supabase project so the guestbook and hit counter
 * are shared by every visitor. Leave both empty and the site still works:
 * the guestbook and counter fall back to this browser only.
 * Setup takes about 10 minutes, see README.md and supabase.sql.
 * The anon key is meant to be public; row-level security in supabase.sql
 * only allows reading, adding guestbook wishes and bumping the counter.
 */
window.PIP_CONFIG = {
  supabaseUrl: '',      // e.g. 'https://abcdxyz.supabase.co'
  supabaseAnonKey: ''   // the "anon public" key from Project Settings → API
};
