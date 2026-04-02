// api/queue.js
// GET /api/queue
// Ambil semua transmisi pending, urut FIFO (created_at ASC)
// Hanya bisa diakses dengan header X-Editor-Token (server-side auth sederhana)

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Editor-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Auth check sederhana — editor dashboard harus kirim token ini di header
  // Untuk production: ganti dengan JWT atau session auth yang proper
  const editorToken = req.headers['x-editor-token'];
  if (!editorToken || editorToken !== process.env.EDITOR_SECRET_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Ambil parameter filter opsional
  const { city, rubric, limit = 50 } = req.query;

  // Build query — ambil yang status 'pending', urut FIFO
  let query = supabase
    .from('transmissions')
    .select(`
      id,
      city_code,
      rubrik_id,
      raw_title,
      raw_content,
      headline_a,
      content_a,
      headline_b,
      content_b,
      status,
      created_at
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })  // FIFO: oldest first
    .limit(Math.min(Number(limit), 100));       // Cap max 100

  if (city) query = query.eq('city_code', city);
  if (rubric) query = query.eq('rubrik_id', rubric);

  const { data, error, count } = await query;

  if (error) {
    console.error('[Supabase Queue Error]', error);
    return res.status(500).json({
      message: 'Gagal mengambil antrian',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  return res.status(200).json({
    items: data || [],
    total: data?.length || 0,
    fetched_at: new Date().toISOString()
  });
}
