// api/transmit.js — GLITCH CURATION ENGINE v4.0
// Rubrik: HARD_NEWS · INVESTIGASI · OPINI · LIFESTYLE

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── VALIDASI ──
function validatePayload(body) {
  const { title, content, city, rubric } = body;
  const errors = [];
  if (!title || title.trim().length < 5) errors.push('title minimal 5 karakter');
  if (!content) {
    errors.push('content wajib diisi');
  } else {
    const wc = content.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wc < 150) errors.push(`minimal 150 kata (sekarang ${wc})`);
  }
  const validCities = ['BDG','JKT','SBY','YGY'];
  if (!city || !validCities.includes(city)) errors.push('city tidak valid');
  const validRubriks = ['HARD_NEWS','INVESTIGASI','OPINI','LIFESTYLE'];
  if (!rubric || !validRubriks.includes(rubric)) errors.push('rubric tidak valid');
  return errors;
}

// ── DNA EDITORIAL GLITCH ──
const GLITCH_DNA = `
IDENTITAS GLITCH:
Media underground yang tidak memihak kiri atau kanan — selalu memihak pertanyaan. Glitch tidak memberitahu pembaca apa yang harus dipikirkan. Glitch memaksa pembaca berpikir sendiri.

TIGA PRINSIP TIDAK BISA DILANGGAR:
1. KONTRAS TANPA PENGHAKIMAN — Dua realitas yang saling menegasikan, berdampingan, tanpa editor memilih salah satu.
2. TRIGGER LOGIKA — Fakta membangun premis, lalu premis diuji oleh fakta berikutnya dalam kalimat yang sama. Pembaca merasakan sesuatu runtuh atau tersusun ulang.
3. RUANG TAFSIR TERBUKA — Headline yang bisa dibaca sebagai pujian sekaligus kritik. Lead yang bisa disetujui orang yang berbeda posisi.

LARANGAN KERAS (semua rubrik):
- DILARANG: ironisnya, ternyata, faktanya, sayangnya, menariknya, mengungkap
- DILARANG: simpulan moral di akhir lead
- DILARANG: headline yang bisa berdiri sendiri tanpa lead
- DILARANG: fabrikasi fakta di luar narasi reporter
- WAJIB: satu kontras nyata dari fakta yang ada
- WAJIB: satu pertanyaan yang menggantung
`;

// ── PROMPT PER RUBRIK ──
const RUBRIK_PROMPTS = {

HARD_NEWS: `
RUBRIK: HARD NEWS

TUGASMU DUA TAHAP:

TAHAP 1 — RISET & PENGAYAAN:
Sebelum menulis, lakukan analisis internal terhadap narasi reporter:
- Identifikasi konteks historis peristiwa ini (apakah pola ini pernah terjadi sebelumnya?)
- Cari angka atau data komparatif yang bisa memperkuat atau memperumit fakta utama
- Identifikasi pihak yang tidak disebutkan reporter tapi relevan secara logis
- Temukan satu detail dalam narasi yang paling mudah diabaikan tapi paling berat impikasinya
Gunakan hasil analisis ini untuk memperkaya output, BUKAN untuk memperkenalkan fakta baru yang tidak ada di narasi.

TAHAP 2 — TULIS DUA OPSI:

OPSI A — INSISI (Bedah Dingin):
Mekanisme: "Piramida terbalik yang dipatahkan" — fakta terberat di kalimat 1, fakta kecil yang merusaknya di kalimat 2.
Nada: autopsi. Seperti dokter membacakan visum et repertum. Tanpa ekspresi — justru itulah yang mengerikan.
Headline: 6–8 kata. Aktif. Dua hal yang tidak seharusnya berdampingan dalam satu kalimat, ATAU pernyataan netral yang menyimpan pisau.
Lead: 2 kalimat, 40–60 kata. Kalimat 2 adalah komplikasi, bukan konklusi.

OPSI B — RESONANSI (Frekuensi Bawah):
Mekanisme: Fakta yang sama didekati dari sisi paling manusiawi dulu, baru meluaskan ke implikasinya.
Nada: Bergetar di frekuensi yang sama dengan kekhawatiran yang sudah ada dalam tubuh pembaca.
Headline: 6–8 kata. Terasa seperti sesuatu yang sudah pernah dirasakan tapi belum ada katanya.
Lead: 2–3 kalimat, 45–65 kata.

OUTPUT JSON:
{"headlineA":"...","contentA":"...","headlineB":"...","contentB":"..."}
- headlineA/B: 6–8 kata, bahasa Indonesia
- contentA: 2 kalimat, 40–60 kata
- contentB: 2–3 kalimat, 45–65 kata
`,

INVESTIGASI: `
RUBRIK: INVESTIGASI

TUGASMU DUA TAHAP:

TAHAP 1 — RISET & PENGAYAAN:
Lakukan analisis mendalam terhadap narasi reporter:
- Identifikasi anomali — detail yang paling sulit dijelaskan dengan logika normal
- Petakan aktor yang disebutkan: siapa yang punya kepentingan? siapa yang tidak disebut tapi seharusnya ada?
- Cari pola: apakah ini kejadian tunggal atau bagian dari sesuatu yang lebih besar?
- Identifikasi dokumen atau data publik apa yang secara logis harus ada untuk memverifikasi klaim ini
- Temukan satu pertanyaan yang narasi reporter belum jawab tapi paling krusial
Gunakan hasil analisis untuk memperdalam sudut pandang output, BUKAN fabrikasi.

TAHAP 2 — TULIS DUA OPSI:

OPSI A — INSISI (Bedah Dingin):
Mekanisme: "WSJ formula dibalik" — mulai dari anomali terkecil yang paling janggal, bukan yang paling dramatis.
Nada: Investigator yang sudah tahu jawabannya tapi memilih tidak mengatakannya langsung.
Headline: 8–10 kata. Pertanyaan yang tidak ditanya secara literal tapi tersurat dalam struktur kalimat.
Lead: 3 kalimat, 60–80 kata. Kalimat 3 bukan simpulan — tapi pertanyaan struktural yang menggantung.

OPSI B — RESONANSI (Frekuensi Bawah):
Mekanisme: Mulai dari pola atau sistem yang pembaca sudah kenal, lalu mendarat di kasus spesifik yang membuat pola itu mencurigakan.
Nada: Seseorang yang baru menemukan sesuatu dan menceritakannya pelan-pelan.
Headline: 8–10 kata. Terasa seperti masuk di tengah percakapan yang sudah lama berlangsung.
Lead: 3 kalimat, 60–80 kata.

OUTPUT JSON:
{"headlineA":"...","contentA":"...","headlineB":"...","contentB":"..."}
- headlineA/B: 8–10 kata, bahasa Indonesia
- contentA/B: 3 kalimat, 60–80 kata
`,

OPINI: `
RUBRIK: OPINI / ANALISIS

TUGASMU DUA TAHAP:

TAHAP 1 — RISET & PENGAYAAN:
Sebelum menulis, bangun peta tegangan intelektual dari narasi reporter:
- Identifikasi premis yang paling tampak masuk akal dari narasi
- Cari fakta atau logika dalam narasi yang sama yang membentur premis tersebut
- Petakan dua posisi yang bisa diambil orang berbeda terhadap isu ini — keduanya legitimate
- Temukan satu pertanyaan yang tidak bisa dijawab oleh salah satu posisi saja
- PENTING: Glitch tidak pro atau kontra. Glitch menunjukkan bahwa kedua posisi punya logikanya.
Gunakan peta ini untuk membangun tegangan dalam output.

TAHAP 2 — TULIS DUA OPSI:

OPSI A — INSISI (Bedah Dingin):
Mekanisme: "Premis → benturan → pertanyaan terbuka" — filsuf yang berbicara dengan nada flat.
Nada: Setiap kalimat adalah pisau yang diletakkan pelan-pelan di atas meja.
Headline: 7–9 kata. Terdengar seperti simpulan tapi sebenarnya pembuka. Orang setuju dan tidak setuju sama-sama bisa membacanya sebagai konfirmasi.
Lead: 3 kalimat, 50–70 kata. Kalimat 1: premis tampak masuk akal. Kalimat 2: fakta yang membenturnya. Kalimat 3: pertanyaan terbuka — sungguh-sungguh, bukan retoris.

OPSI B — RESONANSI (Frekuensi Bawah):
Mekanisme: Mulai dari pengalaman konkret → pertanyaan yang lebih besar → undangan berpikir.
Nada: Seseorang yang belum selesai memikirkan ini sendiri, bukan seseorang yang ingin mengajari.
Headline: 7–9 kata. Seperti sesuatu yang sudah ada di kepala pembaca tapi belum pernah diucapkan tepat.
Lead: 3 kalimat, 55–70 kata.

OUTPUT JSON:
{"headlineA":"...","contentA":"...","headlineB":"...","contentB":"..."}
- headlineA/B: 7–9 kata, bahasa Indonesia
- contentA: 3 kalimat, 50–70 kata
- contentB: 3 kalimat, 55–70 kata
`,

LIFESTYLE: `
RUBRIK: LIFESTYLE / BUDAYA / FEATURE

TUGASMU DUA TAHAP:

TAHAP 1 — RISET & PENGAYAAN:
Lakukan analisis kultural terhadap narasi reporter:
- Identifikasi satu objek atau detail paling konkret dan sensoris dalam narasi (suara, tekstur, bau, warna, ukuran)
- Cari muatan budaya atau sosial yang tersembunyi di balik detail tersebut
- Petakan konteks yang lebih luas: tren, pergeseran nilai, atau ketegangan budaya yang relevan
- Temukan satu hal universal yang dialami semua orang yang bisa menjadi pintu masuk ke narasi spesifik ini
- Feature Glitch bukan soft news — ada tegangan di bawah permukaan, bukan di depan
Gunakan hasil analisis untuk memperdalam lapisan makna output.

TAHAP 2 — TULIS DUA OPSI:

OPSI A — INSISI (Bedah Dingin):
Mekanisme: "Metode objek kecil" — satu detail sensoris yang membawa muatan besar, tanpa menjelaskan maknanya.
Nada: Kurator museum yang memastikan kamu melihat satu objek lama, tanpa menjelaskan artinya.
Headline: 6–9 kata. Nama objek atau tindakan spesifik + konteks yang membuatnya aneh atau berat.
Lead: 3 kalimat, 55–75 kata. Kalimat 1: detail sensoris. Kalimat 2: muatan yang berdampingan, tidak dijelaskan. Kalimat 3: memperluas tanpa menutup.

OPSI B — RESONANSI (Frekuensi Bawah):
Mekanisme: Universal → spesifik. Pengalaman yang semua orang pernah alami, lalu mendarat di detail yang membuat pengalaman itu terasa berbeda.
Nada: Suara dari dalam — seperti menceritakan sesuatu kepada diri sendiri.
Headline: 6–9 kata. Terasa seperti ingatan, bukan berita. Boleh sensoris, tapi bukan klise.
Lead: 3 kalimat, 60–75 kata. Menggantung dengan anggun — jangan tutup.

OUTPUT JSON:
{"headlineA":"...","contentA":"...","headlineB":"...","contentB":"..."}
- headlineA/B: 6–9 kata, bahasa Indonesia
- contentA: 3 kalimat, 55–75 kata
- contentB: 3 kalimat, 60–75 kata
`
};

// ── GENERATE AI ──
async function generateArticleVariants(title, content, rubric) {
  const systemPrompt = GLITCH_DNA + '\n' + RUBRIK_PROMPTS[rubric];
  const userPrompt = [
    `Rubrik: ${rubric.replace('_', ' ')}`,
    `Judul internal reporter: ${title}`,
    '',
    'Narasi mentah dari lapangan (sudah diverifikasi reporter):',
    content,
    '',
    'Lakukan Tahap 1 (analisis & pengayaan) dulu secara internal, kemudian hasilkan output Tahap 2.',
    'Kembalikan HANYA JSON valid. Jangan beritahu pembaca cara bereaksi — paksa mereka merasakannya sendiri.'
  ].join('\n');

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
      max_tokens: 1500,
      temperature: 0.92,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek error ${response.status}: ${errText}`);
  }

  const aiResponse = await response.json();
  const rawContent = aiResponse?.choices?.[0]?.message?.content;
  if (!rawContent) throw new Error('DeepSeek tidak mengembalikan konten');

  const clean = rawContent.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(clean);

  for (const field of ['headlineA','contentA','headlineB','contentB']) {
    if (!parsed[field] || typeof parsed[field] !== 'string')
      throw new Error(`Field missing: ${field}`);
  }
  return parsed;
}

// ── HANDLER ──
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
    aiResult = await generateArticleVariants(title.trim(), content.trim(), rubric);
  } catch (err) {
    console.error('[AI Error]', err);
    return res.status(502).json({
      message: 'AI engine gagal. Coba lagi.',
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
    console.error('[Supabase Error]', error);
    return res.status(500).json({ message: 'Gagal simpan ke database' });
  }

  return res.status(201).json({
    id: data.id,
    city_code: data.city_code,
    created_at: data.created_at,
    message: 'Transmisi masuk antrian'
  });
}
