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

    if (!rawPhone || !userMessage || userMessage.length < 2) {
      return res.status(200).json({ status: 'no_data_or_too_short' });
    }

    let cleanedPhone = String(rawPhone).replace(/\D/g, '');
    if (!cleanedPhone.startsWith('55')) {
      cleanedPhone = '55' + cleanedPhone;
    }

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
            content: `Você é o assistente oficial da TheraSoul, a plataforma definitiva para a evolução e organização do terapeuta holístico.

OBJETIVO DA THERASOUL:
- Proporcionar uma "Clínica em Piloto Automático" com Inteligência Holística.
- Organização Consciente: Gestão de agenda, prontuário digital inteligente e automação de fluxos e consultas.
- Evolução do Terapeuta: Tirar a carga administrativa para que o profissional tenha fluidez, abundância e conexão profunda com os pacientes.
- Tecnologia com Alma: Unificar dados para tomada de decisão terapêutica.

DIFERENCIAL DE CONHECIMENTO:
- O terapeuta pode alimentar a inteligência da plataforma com seu próprio repertório (PDFs, livros, apostilas e anotações).
- A IA absorve o que o terapeuta APRENDEU, tornando-se um braço direito especialista que reflete o conhecimento e a metodologia dele.

DIRETRIZES:
1. FOCO: Organização, Fluidez e Evolução do terapeuta.
2. TOM: Sereno, profissional, elevado e focado em harmonia.
3. RESTRIÇÃO: Nunca mencione Clínica Alberton ou temas médicos/odontológicos.
4. EQUIPE: Temos estrategistas prontos para configurar esse ecossistema unificado para o terapeuta.` 
          },
          { role: 'user', content: String(userMessage) }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    const botReply = aiData.choices[0].message.content;

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
    console.error('Erro no TheraSoul:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
