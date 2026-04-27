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

    if (!rawPhone || !userMessage || userMessage.length < 2) {
      return res.status(200).json({ status: 'no_data_or_too_short' });
    }

    // 2. FORMATAÇÃO DO NÚMERO
    let cleanedPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }

    // 3. O CÉREBRO DO THERASOUL (Foco Total em Escala para Terapeutas)
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
            content: `Você é o assistente oficial da Therasoul, uma aceleradora focada em terapeutas holísticos.

SEU PAPEL:
Ajudar terapeutas a entenderem que podem escalar seu impacto e faturamento transformando seu conhecimento em mentorias e cursos online.

DIRETRIZES:
1. FOCO ÚNICO: Fale apenas sobre a Therasoul e a transição do consultório físico para o digital.
2. EQUIPE: Se perguntarem sobre quem faz, diga que a Therasoul conta com uma equipe especializada em estratégia digital e tecnologia para escala. Não cite nomes específicos.
3. ESTILO: Empático, encorajador e profissional. Use termos como "liberdade geográfica", "escala de impacto" e "saída do operacional".
4. RESTRIÇÃO: Nunca mencione clínicas, doutoras, odontologia ou a Clínica Alberton. Esse é um ecossistema totalmente independente.` 
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

    return res.status(200).json({ status: 'success' });

  } catch (error) {
    console.error('Erro no Therasoul:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
