export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método Não Permitido' });
  }

  try {
    const { text, connectedPhone } = req.body;
    
    // Pega apenas o texto da mensagem, independente do formato
    const userMessage = text?.message || text || "Oi";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: String(userMessage) }],
      }),
    });

    const data = await response.json();
    const botReply = data.choices[0].message.content;

    // Envia de volta para o WhatsApp via Z-API
    await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: connectedPhone, message: botReply }),
    });

    res.status(200).json({ status: 'Sucesso' });
  } catch (error) {
    console.error('Erro no Webhook:', error);
    res.status(500).json({ error: error.message });
  }
}
