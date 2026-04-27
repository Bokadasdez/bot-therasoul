import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;
  if (body.fromMe === true || body.isGroup === true) {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    const userMessage = body.text?.message || body.text;
    let rawPhone = body.phone || body.connectedPhone || body.data?.phone;

    if (!rawPhone || !userMessage) {
        return res.status(200).json({ status: 'no_data' });
    }

    const targetPhone = String(rawPhone).replace(/\D/g, '');

    // 1. CHAMA A OPENAI
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é o assistente do Therasoul. Responda de forma curta.' },
          { role: 'user', content: String(userMessage) }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const botReply = aiData.choices[0].message.content;

    // 2. ENVIA PARA A Z-API E ESPERA A RESPOSTA (AQUI É O SEGREDO)
    const zapiResponse = await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Client-Token': process.env.Z_API_CLIENT_TOKEN 
      },
      body: JSON.stringify({ phone: targetPhone, message: botReply }),
    });

    const zapiResult = await zapiResponse.json();
    
    // 3. SÓ RESPONDE A VERCEL DEPOIS QUE A Z-API CONFIRMAR
    console.log('RESPOSTA DA Z-API:', JSON.stringify(zapiResult));
    return res.status(200).json(zapiResult);

  } catch (error) {
    console.error('ERRO CRÍTICO:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
