// api/transmit.js
// POST /api/transmit
// Menerima raw data dari reporter, proses AI, simpan ke Supabase
// Returns: { id, city_code, message }

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Gunakan service role (bukan anon) untuk insert server-side
);

// ── VALIDASI INPUT ──
function validatePayload(body) {
  const { title, content, city, rubric } = body;
  const errors = [];

  if (!title || typeof title !== 'string' || title.trim().length < 5) {
    errors.push('title harus diisi minimal 5 karakter');
  }

  if (!content || typeof content !== 'string') {
    errors.push('content wajib diisi');
  } else {
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 150) {
      errors.push(`content harus minimal 150 kata (saat ini ${wordCount} kata)`);
    }
  }

  const validCities = ['BDG', 'JKT', 'SBY', 'YGY'];
  if (!city || !validCities.includes(city)) {
    errors.push(`city tidak valid. Pilihan: ${validCities.join(', ')}`);
  }

  const validRubriks = ['LIAR', 'BISING', 'GERAK', 'DIAM'];
  if (!rubric || !validRubriks.includes(rubric)) {
    errors.push(`rubric tidak valid. Pilihan: ${validRubriks.join(', ')}`);
  }

  return errors;
}

// ── CALL DEEPSEEK AI ──
async function generateArticleVariants(title, content) {
  const systemPrompt = `Kamu adalah editor AI untuk media underground Glitch. 
Tugasmu: buat 2 versi headline + lead paragraph dari narasi mentah reporter.

Opsi A (Detective): Gaya investigatif, to-the-point, fakta dulu. Headline pendek, kuat, mengancam.
Opsi B (Poet): Gaya sastra, metaforis, emosional. Headline punya daya tarik estetik.

Kembalikan HANYA JSON valid tanpa markdown, tanpa komentar, dalam format ini:
{
  "headlineA": "...",
  "contentA": "...",
  "headlineB": "...",
  "contentB": "..."
}

Aturan:
- headlineA dan headlineB: maks 12 kata, bahasa Indonesia
- contentA dan contentB: 2-3 kalimat lead paragraph, bahasa Indonesia
- Jangan fabrikasi fakta di luar narasi yang diberikan`;

  const userPrompt = `Judul internal: ${title}\n\nNarasi reporter:\n${content}`;

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 800,
      temperature: 0.8,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
  }

  const aiResponse = await response.json();

  // Ambil content dari choices
  const rawContent = aiResponse?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('DeepSeek tidak mengembalikan konten');
  }

  // Parse JSON — strip markdown fences kalau ada
  const clean = rawContent.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  // Validasi field yang dibutuhkan ada semua
  const required = ['headlineA', 'contentA', 'headlineB', 'contentB'];
  for (const field of required) {
    if (!parsed[field] || typeof parsed[field] !== 'string') {
      throw new Error(`Field AI tidak lengkap: ${field} missing atau bukan string`);
    }
  }

  return parsed;
}

// ── MAIN HANDLER ──
export default async function handler(req, res) {
  // CORS headers (sesuaikan origin untuk production)
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // 1. Validasi input
  const errors = validatePayload(req.body);
  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Validasi gagal',
      errors
    });
  }

  const { title, content, city, rubric } = req.body;

  // 2. Panggil AI
  let aiResult;
  try {
    aiResult = await generateArticleVariants(title.trim(), content.trim());
  } catch (err) {
    console.error('[AI Error]', err);
    return res.status(502).json({
      message: 'AI engine gagal memproses narasi. Coba lagi.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }

  // 3. Simpan ke Supabase dengan semua field termasuk status
  const { data, error } = await supabase
    .from('transmissions')
    .insert([{
      city_code: city,
      rubrik_id: rubric,
      raw_title: title.trim(),
      raw_content: content.trim(),
      headline_a: aiResult.headlineA,
      content_a: aiResult.contentA,
      headline_b: aiResult.headlineB,
      content_b: aiResult.contentB,
      status: 'pending',         // Status untuk FIFO queue
      created_at: new Date().toISOString()
    }])
    .select('id, city_code, created_at')  // Hanya ambil field yang perlu dikembalikan
    .single();

  if (error) {
    console.error('[Supabase Insert Error]', error);
    return res.status(500).json({
      message: 'Gagal menyimpan ke database',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  // 4. Return minimal confirmation (BUKAN full AI data — editor ambil sendiri via GET /api/queue)
  return res.status(201).json({
    id: data.id,
    city_code: data.city_code,
    created_at: data.created_at,
    message: 'Transmisi berhasil diterima dan masuk antrian'
  });
}
