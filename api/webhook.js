import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const body = req.body;

  // 1. FILTROS DE SEGURANÇA
  if (body.fromMe === true || body.isGroup === true) {
    return res.status(200).json({ status: 'ignored' });
  }

  try {
    const userMessage = body.text?.message || body.text;
    let rawPhone = body.phone || body.connectedPhone || body.data?.phone;

    if (!rawPhone || !userMessage || userMessage.length < 2) {
      return res.status(200).json({ status: 'no_data_or_too_short' });
    }

    // 2. FORMATAÇÃO DO NÚMERO
    let cleanedPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }

    // 3. O CÉREBRO DO THERASOUL (Foco em IA Personalizada e Escala)
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
            content: `Você é o assistente oficial da Therasoul.
Sua missão é ajudar terapeutas holísticos a escalarem seu impacto e faturamento através da tecnologia.

DIFERENCIAL TECNOLÓGICO (Mencione isso):
- O terapeuta pode alimentar a IA com seu próprio conhecimento (PDFs, livros, apostilas, cursos próprios).
- A IA absorve esse conteúdo e passa a ter o "cérebro" do terapeuta, tornando-se uma especialista na metodologia específica dele.

OBJETIVO DA THERASOUL:
- Escalar o faturamento transformando conhecimento em mentorias e produtos digitais.
- Permitir que o terapeuta atenda mais pessoas com a mesma qualidade, usando uma IA que pensa como ele.

DIRETRIZES:
1. FOCO: Escala, Faturamento e IA Personalizada (Brain Digital).
2. TOM: Visionário, profissional e seguro.
3. RESTRIÇÕES: Não mencione Clínica Alberton, odontologia ou nomes de médicos. 
4. EQUIPE: Temos estrategistas prontos para criar esse "cérebro digital" para o terapeuta.` 
          },
          { role: 'user', content: String(userMessage) }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const botReply = aiData.choices[0].message.content;

    // 4. ENTREGA VIA Z-API
    await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Client-Token': process.env.Z_API_CLIENT_TOKEN 
      },
      body: JSON.stringify({ phone: cleanedPhone, message: botReply }),
    });

    return res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Erro no Therasoul:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
