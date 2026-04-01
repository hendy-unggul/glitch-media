import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { title, content, city, rubric } = req.body;

  // 1. Panggil DeepSeek
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "You are Glitch AI. Return ONLY JSON: {headlineA, contentA, headlineB, contentB}" },
        { role: "user", content: `Title: ${title}\nContent: ${content}` }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const aiResult = JSON.parse((await response.json()).choices[0].message.content);

  // 2. Simpan ke Supabase (Antrian FIFO)
  const { data, error } = await supabase
    .from('transmissions')
    .insert([{
      city_code: city,
      rubrik_id: rubric,
      raw_title: title,
      raw_content: content,
      headline_a: aiResult.headlineA,
      content_a: aiResult.contentA,
      headline_b: aiResult.headlineB,
      content_b: aiResult.contentB
    }]);

  if (error) return res.status(500).json(error);
  return res.status(200).json({ status: "Queued" });
}
