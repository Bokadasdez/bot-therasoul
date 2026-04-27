export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método Não Permitido' });
  }

  try {
    // A Z-API pode enviar o telefone em vários lugares diferentes
    const body = req.body;
    const userMessage = body.text?.message || body.text || "Oi";
    
    // Tenta pegar o telefone de todas as formas possíveis
    const rawPhone = body.phone || body.connectedPhone || body.data?.phone || body.sender?.phone;

    if (!rawPhone) {
       console.error("Telefone não encontrado no corpo da requisição");
       return res.status(200).json({ status: 'Sem telefone' });
    }

    // Limpa o número (deixa só dígitos)
    const targetPhone = String(rawPhone).replace(/\D/g, '');

    // Chamada para OpenAI
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

    // Envia para a Z-API
    await fetch(`https://api.z-api.io/instances/${process.env.Z_API_INSTANCE}/token/${process.env.Z_API_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        phone: targetPhone, 
        message: botReply 
      }),
    });

    res.status(200).json({ status: 'Sucesso' });
  } catch (error) {
    console.error('Erro:', error.message);
    res.status(500).json({ error: error.message });
  }
}
