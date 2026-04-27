export default async function (req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;

  // ESTA LINHA É A MAIS IMPORTANTE: 
  // Se a mensagem veio do próprio bot (fromMe), ignora e encerra aqui.
  if (body.fromMe === true || body.isGroup === true) {
    return res.status(200).json({ status: 'ignored' });
  }

  // Responde 200 imediatamente para a Z-API não tentar reenviar por "timeout"
  res.status(200).json({ status: 'received' });

  try {
    const userMessage = body.text?.message || body.text;
    const rawPhone = body.phone || body.connectedPhone || body.data?.phone || body.sender?.phone;

    if (!rawPhone || !userMessage) return;
    const targetPhone = String(rawPhone).replace(/\D/g, '');

    // Chamada OpenAI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é o assistente do Therasoul. Seja breve.' },
          { role: 'user', content: String(userMessage) }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const botReply = aiData.choices[0].message.content;

    // Envia para a Z-API
    await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Client-Token': process.env.Z_API_CLIENT_TOKEN 
      },
      body: JSON.stringify({ phone: targetPhone, message: botReply }),
    });

  } catch (error) {
    console.error('Erro:', error.message);
  }
}
