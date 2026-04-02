// api/publish.js — v2
// POST /api/publish
// Field mapping: editor dashboard → Supabase published_articles → /api/feed → index.html

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeSlug(headline) {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 80)
    + '-' + Date.now().toString(36);
}

export async function publishHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Editor-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const editorToken = req.headers['x-editor-token'];
  if (!editorToken || editorToken !== process.env.EDITOR_SECRET_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // ── FIELD MAPPING ──
  // Semua field yang masuk dari editor dashboard
  // → langsung mapped ke kolom published_articles
  // → lalu dikembalikan oleh /api/feed
  // → lalu dirender oleh index.html
  const {
    transmission_id,   // FK ke transmissions.id
    final_headline,    // → published_articles.headline → renderHero/renderCard h3
    final_hook,        // → published_articles.hook → renderHero/renderCard p
    editor_note,       // → published_articles.editor_note (internal)
    chosen_option,     // → published_articles.chosen_option ('A' atau 'B')
    chosen_content,    // → published_articles.body (isi artikel penuh)
    city_code,         // → published_articles.city_code → /api/feed?city= filter
    rubrik_id,         // → published_articles.rubrik_id → badge + label
    is_hero,           // → published_articles.is_hero → hero section di front page
    image_url          // → published_articles.image_url → gambar hero/card
  } = req.body;

  // Validasi wajib
  if (!transmission_id) return res.status(400).json({ message: 'transmission_id wajib' });
  if (!final_headline?.trim()) return res.status(400).json({ message: 'final_headline wajib' });
  if (!final_hook?.trim()) return res.status(400).json({ message: 'final_hook wajib' });
  if (!['A','B'].includes(chosen_option)) return res.status(400).json({ message: 'chosen_option harus A atau B' });

  // Cek transmisi masih pending
  const { data: tx, error: txErr } = await supabase
    .from('transmissions')
    .select('id, status')
    .eq('id', transmission_id)
    .single();

  if (txErr || !tx) return res.status(404).json({ message: 'Transmisi tidak ditemukan' });
  if (tx.status !== 'pending') {
    return res.status(409).json({ message: `Transmisi sudah ${tx.status}` });
  }

  // Kalau is_hero=true, unset hero lama untuk kota yang sama
  // Hanya satu hero per kota
  if (is_hero) {
    await supabase
      .from('published_articles')
      .update({ is_hero: false })
      .eq('city_code', city_code)
      .eq('is_hero', true);
  }

  const slug = makeSlug(final_headline);
  const publishedAt = new Date().toISOString();

  // Insert ke published_articles
  // Semua field di sini adalah yang akan dikembalikan /api/feed dan dirender index.html
  const { data: article, error: insertErr } = await supabase
    .from('published_articles')
    .insert([{
      transmission_id,
      city_code,
      rubrik_id,
      slug,
      headline: final_headline.trim(),   // → index.html: h1/h3
      hook: final_hook.trim(),            // → index.html: p deskripsi
      body: chosen_content,               // → artikel.html: konten penuh
      chosen_option,
      editor_note: editor_note?.trim() || null,
      is_hero: is_hero === true,          // → index.html: hero section
      image_url: image_url?.trim() || null, // → index.html: background-image
      published_at: publishedAt
    }])
    .select('id, slug, is_hero')
    .single();

  if (insertErr) {
    console.error('[Publish Error]', insertErr);
    return res.status(500).json({ message: 'Gagal insert artikel' });
  }

  // Update status transmisi
  await supabase
    .from('transmissions')
    .update({
      status: 'published',
      published_at: publishedAt,
      published_article_id: article.id
    })
    .eq('id', transmission_id);

  return res.status(200).json({
    message: 'Artikel berhasil dipublish',
    article_id: article.id,
    slug: article.slug,
    is_hero: article.is_hero,
    published_at: publishedAt,
    live_url: `https://glitch-media.vercel.app/index.html?city=${city_code}`
  });
}

export async function rejectHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Editor-Token');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const editorToken = req.headers['x-editor-token'];
  if (!editorToken || editorToken !== process.env.EDITOR_SECRET_TOKEN) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { transmission_id, reason } = req.body;
  if (!transmission_id) return res.status(400).json({ message: 'transmission_id wajib' });

  const { error } = await supabase
    .from('transmissions')
    .update({
      status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: reason?.trim() || null
    })
    .eq('id', transmission_id)
    .eq('status', 'pending');

  if (error) {
    console.error('[Reject Error]', error);
    return res.status(500).json({ message: 'Gagal reject' });
  }

  return res.status(200).json({ message: 'Transmisi ditolak dan diarsipkan' });
}

export default async function handler(req, res) {
  return publishHandler(req, res);
}
