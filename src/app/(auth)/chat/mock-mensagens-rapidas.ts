export type MensagemRapida = { id: string; titulo: string; conteudo: string }

export const MOCK_MENSAGENS_RAPIDAS: MensagemRapida[] = [
  {
    id: "1",
    titulo: "/ola",
    conteudo: "Olá! Bem-vindo ao nosso atendimento. Como posso ajudar?",
  },
  {
    id: "2",
    titulo: "/catalogo",
    conteudo: "Vou te enviar nosso catálogo atualizado agora mesmo!",
  },
  {
    id: "3",
    titulo: "/prazo",
    conteudo: "Nosso prazo de entrega é de 2 a 3 dias úteis para a sua região.",
  },
  {
    id: "4",
    titulo: "/pagamento",
    conteudo:
      "Trabalhamos com boleto, PIX e cartão. Para pedidos acima de R$ 5.000, temos parcelamento em 30/60/90 dias sem juros.",
  },
  {
    id: "5",
    titulo: "/obrigado",
    conteudo: "Obrigado pelo seu pedido! Qualquer dúvida, estou à disposição.",
  },
]
