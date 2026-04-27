import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;

  // 1. FILTROS DE SEGURANÇA (Anti-loop e Grupos)
  if (body.fromMe === true || body.isGroup === true) {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    const userMessage = body.text?.message || body.text;
    let rawPhone = body.phone || body.connectedPhone || body.data?.phone;

    // Ignora mensagens vazias, muito curtas ou áudios/figurinhas
    if (!rawPhone || !userMessage || userMessage.length < 2) {
      return res.status(200).json({ status: 'no_data_or_too_short' });
    }

    // 2. FORMATAÇÃO DO NÚMERO
    let cleanedPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }

    // 3. O CÉREBRO DO THERASOUL (Aqui definimos a eficiência para terapeutas)
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { 
            role: 'system', 
            content: `Você é a assistente da Therasoul, especialista em expansão para terapeutas holísticos na Alberton Academy.
            SEU OBJETIVO: Ajudar o terapeuta a entender que ele pode escalar o conhecimento dele através de cursos e mentorias.
            
            DIRETRIZES:
            - Tom: Acolhedor, profissional e focado em resultados.
            - Seja breve: Terapeutas valorizam o tempo. Responda em no máximo 2 ou 3 parágrafos.
            - Use termos como "escalabilidade", "mentoria", "liberdade de tempo" e "impacto".
            - Se falarem de preço, diga que a análise de expansão é personalizada.
            - Equipe técnica: Mencione que temos especialistas como Simone e Vick para cuidar da estrutura.` 
          },
          { role: 'user', content: String(userMessage) }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const botReply = aiData.choices[0].message.content;

    // 4. ENTREGA VIA Z-API
    const zapiResponse = await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Client-Token': process.env.Z_API_CLIENT_TOKEN 
      },
      body: JSON.stringify({ phone: cleanedPhone, message: botReply }),
    });

    const zapiResult = await zapiResponse.json();
    console.log('Therasoul Enviou:', zapiResult);

    return res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Erro no Therasoul:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
