// Vercel serverless function: nhận 1 đoạn tài liệu -> trả về câu hỏi ôn tập (JSON)
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Chỉ hỗ trợ POST' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: 'Thiếu biến môi trường ANTHROPIC_API_KEY trên Vercel' });
  const { text = '', part = 1, total = 1 } = req.body || {};
  if (text.trim().length < 40) return res.status(400).json({ error: 'Tài liệu quá ngắn' });
  const n = Math.min(14, Math.max(5, Math.ceil(text.length / 450)));
  const system = `Bạn là gia sư giúp người học GHI NHỚ tài liệu. Viết bằng đúng ngôn ngữ của tài liệu. Chỉ trả về JSON hợp lệ (không markdown) dạng: {"title":"","summary":["ý chính"],"mcq":[{"q":"","options":["","","",""],"answer":0,"explain":"giải thích + mẹo nhớ"}],"cloze":[{"q":"câu trích từ tài liệu có chỗ trống ____","a":"đáp án ngắn 1-3 từ"}],"essay":[{"q":"","sample":"","points":[""]}]}. Tạo khoảng ${n} câu mcq 4 đáp án (answer là chỉ số 0-3), ${Math.ceil(n / 2)} câu cloze, 2-3 câu essay, summary 2-4 ý. Phủ MỌI ý, số liệu, định nghĩa quan trọng, không trùng lặp, đáp án nhiễu hợp lý. Chỉ dùng thông tin trong tài liệu.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || 'claude-sonnet-5-5', max_tokens: 6000, system, messages: [{ role: 'user', content: `Phần ${part}/${total}:\n\n${text}` }] }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data?.error?.message || 'Lỗi gọi Claude API' });
    const raw = (data.content || []).map(c => c.text || '').join('');
    return res.status(200).json(JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)));
  } catch (e) { return res.status(500).json({ error: 'Không đọc được kết quả: ' + e.message }); }
};
