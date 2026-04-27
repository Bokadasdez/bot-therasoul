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

    // Ignora mensagens vazias, muito curtas ou formatos não suportados
    if (!rawPhone || !userMessage || userMessage.length < 2) {
      return res.status(200).json({ status: 'no_data_or_too_short' });
    }

    // 2. FORMATAÇÃO DO NÚMERO (Garante 55 + limpeza)
    let cleanedPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }

    // 3. O CÉREBRO DO THERASOUL (Ajustado para Especialista em Escala Digital)
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
Seu foco exclusivo é ajudar terapeutas holísticos a transformarem seu conhecimento em produtos digitais escaláveis (cursos, mentorias e plataformas).

DIRETRIZES DE ATENDIMENTO:
1. FOCO: Therasoul é uma aceleradora de conhecimento para terapeutas. Não mencione clínicas, consultórios médicos ou outros negócios de saúde física.
2. ESPECIALISTAS: Se mencionar equipe técnica ou estratégica, diga que a Therasoul conta com especialistas como Vick e Simone para estruturar toda a presença digital do terapeuta.
3. ESTILO: Profissional, empático e visionário. Use uma linguagem que ressoe com o público holístico (equilíbrio, propósito, energia), mas com foco pragmático em resultados de negócio (escala, automação, liberdade de tempo).
4. OBJETIVO: Conduzir o terapeuta a entender que ele não precisa ficar preso apenas à agenda de atendimentos individuais para crescer.

IMPORTANTE: Nunca mencione "Clínica Alberton" ou assuntos de odontologia. O foco é 100% na jornada digital e na escala do terapeuta com a Therasoul.` 
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
