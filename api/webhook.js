export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  try {
    const body = req.body;
    console.log('Pancake webhook received:', JSON.stringify(body));

    const event = body?.event;
    const message = body?.message;
    const conversationId = body?.conversation_id || body?.id;
    const pageId = body?.page_id;

    if (event !== 'new_message' || !message?.text || message?.from_page) {
      return res.status(200).json({ ok: true });
    }

    const customerMessage = message.text;
    console.log('Customer message:', customerMessage);

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `Bạn là trợ lý tư vấn bán hàng của AMAN STORE - shop thời trang nam cao cấp tại Việt Nam. 
Hãy trả lời khách hàng một cách thân thiện, chuyên nghiệp và ngắn gọn bằng tiếng Việt.
Tập trung tư vấn về sản phẩm quần áo nam, size, chất liệu, giá cả và chính sách đổi trả.
Nếu không biết thông tin cụ thể, hãy xin số điện thoại để nhân viên liên hệ lại.`,
        messages: [{ role: 'user', content: customerMessage }],
      }),
    });

    const claudeData = await claudeResponse.json();
    const replyText = claudeData?.content?.[0]?.text;

    if (!replyText) {
      console.error('No reply from Claude:', claudeData);
      return res.status(200).json({ ok: true });
    }

    const pancakeResponse = await fetch(
      `https://pages.fm/api/v1/pages/${pageId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.PANCAKE_API_KEY,
          message: replyText,
        }),
      }
    );

    const pancakeData = await pancakeResponse.json();
    console.log('Pancake response:', JSON.stringify(pancakeData));

    return res.status(200).json({ ok: true, reply: replyText });
  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({ ok: true });
  }
}
