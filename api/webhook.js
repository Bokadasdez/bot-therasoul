import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;

  // 1. Filtro de segurança contra loops
  if (body.fromMe === true || body.isGroup === true) {
    return res.status(200).json({ status: 'ignored' });
  }

  // 2. Resposta rápida para a Z-API
  res.status(200).json({ status: 'received' });

  try {
    const userMessage = body.text?.message || body.text;
    let rawPhone = body.phone || body.connectedPhone || body.data?.phone;

    if (!rawPhone || !userMessage) return;

    // 3. Limpeza rigorosa do número (Remove tudo que não é número)
    let targetPhone = String(rawPhone).replace(/\D/g, '');

    // 4. Chamada OpenAI (Onde seu saldo está sendo usado)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Você é o assistente do Therasoul. Responda de forma breve e direta.' },
          { role: 'user', content: String(userMessage) }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const botReply = aiData.choices[0].message.content;

    // 5. Envio para a Z-API com tratamento de erro visível
    const zapiResponse = await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Client-Token': process.env.Z_API_CLIENT_TOKEN 
      },
      body: JSON.stringify({ 
        phone: targetPhone, 
        message: botReply 
      }),
    });

    const zapiResult = await zapiResponse.json();
    console.log('LOG FINAL Z-API:', JSON.stringify(zapiResult));

  } catch (error) {
    console.error('ERRO NO FLUXO:', error.message);
  }
}
