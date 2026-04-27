import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;

  // 1. Evita loops (Ignora se for o próprio bot ou grupo)
  if (body.fromMe === true || body.isGroup === true) {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    const userMessage = body.text?.message || body.text;
    let rawPhone = body.phone || body.connectedPhone || body.data?.phone;

    if (!rawPhone || !userMessage) {
      return res.status(200).json({ status: 'no_data' });
    }

    // 2. FORMATAÇÃO DO NÚMERO (Ajuste para SC/Brasil)
    let cleanedPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }

    // 3. CHAMADA OPENAI (Seu saldo caiu, então aqui está OK)
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

    // 4. ENVIO PARA Z-API (Com logs para a gente achar o erro)
    const zapiResponse = await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Client-Token': process.env.Z_API_CLIENT_TOKEN 
      },
      body: JSON.stringify({ phone: cleanedPhone, message: botReply }),
    });

    const zapiResult = await zapiResponse.json();
    console.log('RESPOSTA FINAL DA Z-API:', zapiResult);

    return res.status(200).json({ status: 'success', zapi: zapiResult });

  } catch (error) {
    console.error('ERRO NO WEBHOOK:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
