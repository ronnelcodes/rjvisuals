import { json, env } from './_shared.mjs';
export const handler = async () => { const e=env(); return e.url&&e.anon ? json(200,{supabaseUrl:e.url,supabaseAnonKey:e.anon}) : json(503,{error:'Site configuration is incomplete.'}); };

