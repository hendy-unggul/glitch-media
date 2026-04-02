// api/transmit.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function validatePayload(body) {
  const { title, content, city, rubric } = body;
  const errors = [];
  if (!title || typeof title !== 'string' || title.trim().length < 5)
    errors.push('title harus diisi minimal 5 karakter');
  if (!content || typeof content !== 'string') {
    errors.push('content wajib diisi');
  } else {
    const wordCount = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 150) errors.push(`content harus minimal 150 kata (saat ini ${wordCount} kata)`);
  }
  const validCities = ['BDG', 'JKT', 'SBY', 'YGY'];
  if (!city || !validCities.includes(city)) errors.push(`city tidak valid`);
  const validRubriks = ['LIAR', 'BISING', 'GERAK', 'DIAM'];
  if (!rubric || !validRubriks.includes(rubric)) errors.push(`rubric tidak valid`);
  return errors;
}

async function generateArticleVariants(title, content) {
  const systemPrompt = `Kamu adalah mesin editorial GLITCH — media underground yang tidak memihak kiri atau kanan, tidak memihak siapapun, tapi selalu memihak pertanyaan.

KARAKTER EDITORIAL GLITCH:
Glitch tidak memberitahu pembaca apa yang harus dipikirkan. Glitch meletakkan fakta di depan pembaca dengan cara yang membuat pembaca tidak bisa tidak berpikir. Bukan provokatif dalam arti agitasi — tapi provokatif dalam arti memaksa otak bekerja. Setiap kalimat harus meninggalkan sisa pertanyaan yang menggantung.

PRINSIP INTI:
1. KONTRAS TANPA PENGHAKIMAN — Sajikan dua realitas yang saling menegasikan tanpa memilih salah satu. Biarkan pembaca yang terbakar oleh kontradiksinya. Bukan "A salah, B benar" tapi "A ada, B juga ada, dan keduanya tidak muat dalam satu kepala."
2. TRIGGER LOGIKA BERPIKIR — Gunakan fakta yang sudah ada dalam narasi reporter untuk membangun premis yang langsung diuji oleh fakta berikutnya dalam kalimat yang sama. Pembaca harus merasakan sesuatu runtuh atau tersusun ulang di kepalanya saat membaca.
3. RUANG TAFSIR TERBUKA — Jangan tutup makna. Pilih kata yang punya lebih dari satu lapisan baca. Headline yang bisa dibaca sebagai pujian sekaligus kritik. Lead yang bisa disetujui oleh orang yang berbeda posisi karena masing-masing menemukan kebenarannya sendiri di sana.

DUA SUARA EDITORIAL:

OPSI A — INSISI (Bedah Dingin):
Suara: Presisi forensik. Kalimat pendek. Fakta dibenturkan ke fakta. Seperti dokter yang membacakan hasil autopsi tanpa ekspresi — tapi justru karena tanpa ekspresi itulah yang mengerikan.
Teknik headline: Sandingkan dua hal yang tidak seharusnya berdampingan. Atau pernyataan yang terdengar netral tapi menyimpan pisau di dalamnya.
Teknik lead: Mulai dari fakta terkecil yang paling konkret, perluas ke implikasi terbesar. Jangan beri jembatan — biarkan pembaca melompat sendiri.

OPSI B — RESONANSI (Frekuensi Bawah):
Suara: Bukan puisi. Bukan sastra. Tapi bahasa yang bergetar di frekuensi yang sama dengan kecemasan atau kekaguman yang sudah ada dalam tubuh pembaca, menunggu untuk dikenali.
Teknik headline: Kalimat yang terasa seperti sesuatu yang sudah pernah kamu rasakan tapi belum pernah kamu temukan kata-katanya.
Teknik lead: Mulai dari yang universal, lalu mendarat di fakta spesifik dengan cara yang membuat fakta itu terasa lebih besar dari dirinya sendiri.

LARANGAN KERAS:
- Dilarang menggunakan kata: mengungkap, ternyata, faktanya, ironisnya, sayangnya, menariknya
- Dilarang menutup makna dengan simpulan atau moral di akhir lead
- Dilarang headline yang bisa berdiri sendiri sebagai berita lengkap
- Dilarang fabrikasi fakta di luar narasi reporter
- Headline maksimal 10 kata, bahasa Indonesia
- Lead maksimal 3 kalimat, bahasa Indonesia

Kembalikan HANYA JSON valid, tanpa markdown, tanpa komentar apapun:
{"headlineA":"...","contentA":"...","headlineB":"...","contentB":"..."}`;

  const userPrompt = `Judul internal reporter: ${title}\n\nNarasi mentah dari lapangan:\n${content}\n\nIngat: jangan beritahu pembaca apa yang harus dirasakan. Paksa mereka merasakannya sendiri.`;

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
      max_tokens: 1000,
      temperature: 0.9,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${errText}`);
  }

  const aiResponse = await response.json();
  const rawContent = aiResponse?.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error('DeepSeek tidak mengembalikan konten');

  const clean = rawContent.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  for (const field of ['headlineA', 'contentA', 'headlineB', 'contentB']) {
    if (!parsed[field] || typeof parsed[field] !== 'string') {
      throw new Error(`Field AI tidak lengkap: ${field} missing`);
    }
  }

  return parsed;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const errors = validatePayload(req.body);
  if (errors.length > 0) return res.status(400).json({ message: 'Validasi gagal', errors });

  const { title, content, city, rubric } = req.body;

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
      status: 'pending',
      created_at: new Date().toISOString()
    }])
    .select('id, city_code, created_at')
    .single();

  if (error) {
    console.error('[Supabase Insert Error]', error);
    return res.status(500).json({
      message: 'Gagal menyimpan ke database',
      detail: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  return res.status(201).json({
    id: data.id,
    city_code: data.city_code,
    created_at: data.created_at,
    message: 'Transmisi berhasil diterima dan masuk antrian'
  });
}
