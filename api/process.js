// api/process.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { title, content, city, rubric } = req.body;
  const DEEPSEEK_KEY = process.env.DEEPSEEK_API_KEY; // Setting di Vercel Dashboard

  const systemPrompt = `You are the Glitch AI Restorative Engine. 
  Process this 150-word report from ${city} (${rubric}). 
  Create 2 styles: 
  A (Detective): Sharp, cynical, noir. 
  B (Urban Poet): Atmospheric, melancholic, soulful. 
  Rules: Open conclusion, no moral judgment, use contrast. 
  Output ONLY JSON: { "headlineA": "...", "contentA": "...", "headlineB": "...", "contentB": "..." }`;

  try {
    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${title}\nContent: ${content}` }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    const aiResult = JSON.parse(data.choices[0].message.content);
    
    // Simulasikan penyimpanan ke DB/Cache sederhana (Trial Mode)
    // Di produksi, Anda akan menyimpan ini ke Supabase/Firebase
    return res.status(200).json({ ...aiResult, originalTitle: title, originalContent: content });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
