export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const body = req.body;
    const userMessage = body.text?.message || body.text || "Oi";
    const rawPhone = body.phone || body.connectedPhone || body.data?.phone || body.sender?.phone;

    if (!rawPhone) {
      console.log("LOG: Telefone não encontrado no corpo da mensagem.");
      return res.status(200).json({ status: 'sem_telefone' });
    }

    const targetPhone = String(rawPhone).replace(/\D/g, '');
    console.log(`LOG: Tentando responder para o número: ${targetPhone}`);

    // Chamada OpenAI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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

    const aiData = await aiResponse.json();
    const botReply = aiData.choices[0].message.content;

   // Envia para a Z-API com a segurança que você ativou
    await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Client-Token': process.env.Z_API_CLIENT_TOKEN // O segredo da segurança
      },
      body: JSON.stringify({ 
        phone: targetPhone, 
        message: botReply 
      }),
    });
