// api/feed.js
// GET /api/feed?city=BDG&limit=10&rubric=HARD_NEWS
// Endpoint publik — tidak perlu auth, data sudah published
// Dipakai oleh index.html untuk render konten dinamis per kota

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Mapping city_code → metadata tampilan front page
const CITY_CONFIG = {
  BDG: { name: 'Bandung',   label: 'BDG', accent: '#ff2d55' },
  JKT: { name: 'Jakarta',   label: 'JKT', accent: '#ff6a00' },
  SBY: { name: 'Surabaya',  label: 'SBY', accent: '#00b4d8' },
  YGY: { name: 'Yogyakarta',label: 'YGY', accent: '#7b2ff7' },
  MDN: { name: 'Medan',     label: 'MDN', accent: '#2ecc71' },
  MKS: { name: 'Makassar',  label: 'MKS', accent: '#f39c12' },
  PTK: { name: 'Pontianak', label: 'PTK', accent: '#e74c3c' },
  JPR: { name: 'Jayapura',  label: 'JPR', accent: '#1abc9c' },
};

// Mapping rubrik_id → label display + badge warna
const RUBRIK_CONFIG = {
  HARD_NEWS:   { label: 'Hard News',   badge: 'LIAR'  },
  INVESTIGASI: { label: 'Investigasi', badge: 'BISING' },
  OPINI:       { label: 'Opini',       badge: 'GERAK' },
  LIFESTYLE:   { label: 'Lifestyle',   badge: 'DIAM'  },
};

export default async function handler(req, res) {
  // Cache publik 60 detik — artikel baru muncul dalam 1 menit
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { city, rubric, limit = 12, offset = 0 } = req.query;

  // city wajib ada dan valid
  const validCities = Object.keys(CITY_CONFIG);
  if (!city || !validCities.includes(city.toUpperCase())) {
    return res.status(400).json({
      message: `city wajib diisi. Pilihan: ${validCities.join(', ')}`
    });
  }

  const cityUpper = city.toUpperCase();
  const safeLimit = Math.min(parseInt(limit) || 12, 50);
  const safeOffset = parseInt(offset) || 0;

  // Build query — ambil dari published_articles, filter city, sort terbaru
  let query = supabase
    .from('published_articles')
    .select(`
      id,
      slug,
      headline,
      hook,
      city_code,
      rubrik_id,
      chosen_option,
      published_at
    `)
    .eq('city_code', cityUpper)
    .order('published_at', { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);

  // Filter rubrik opsional
  if (rubric && Object.keys(RUBRIK_CONFIG).includes(rubric.toUpperCase())) {
    query = query.eq('rubrik_id', rubric.toUpperCase());
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('[Feed Error]', error);
    return res.status(500).json({ message: 'Gagal mengambil feed' });
  }

  // Enrich setiap artikel dengan display config
  const enriched = (articles || []).map((article, index) => {
    const rubrikCfg = RUBRIK_CONFIG[article.rubrik_id] || { label: article.rubrik_id, badge: article.rubrik_id };
    return {
      id: article.id,
      slug: article.slug,
      headline: article.headline,
      hook: article.hook,
      city_code: article.city_code,
      rubrik_id: article.rubrik_id,
      rubrik_label: rubrikCfg.label,
      rubrik_badge: rubrikCfg.badge,
      published_at: article.published_at,
      published_relative: formatRelative(article.published_at),
      is_hero: index === 0,          // Artikel pertama = hero
      chosen_option: article.chosen_option
    };
  });

  return res.status(200).json({
    city: cityUpper,
    city_config: CITY_CONFIG[cityUpper],
    total: enriched.length,
    has_live_content: enriched.length > 0,
    articles: enriched
  });
}

// Format waktu relatif: "3 jam lalu", "2 hari lalu"
function formatRelative(isoString) {
  if (!isoString) return '—';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
}
