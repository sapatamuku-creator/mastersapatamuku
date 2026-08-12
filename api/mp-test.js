export default async function handler(req, res) {
  return res.status(200).json({ ok: true, env_check: !!process.env.SUPABASE_ANON_KEY });
}
