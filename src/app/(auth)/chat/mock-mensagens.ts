export type TipoMensagem = "texto" | "imagem" | "audio" | "video" | "documento" | "nota_interna"
export type DirecaoMensagem = "enviada" | "recebida"
export type StatusMensagem = "enviado" | "entregue" | "lido" | "falhou"

export interface Mensagem {
  id: string
  conversaId: string
  tipo: TipoMensagem
  direcao: DirecaoMensagem
  conteudo: string
  horario: string
  status?: StatusMensagem
  replyDe?: { id: string; texto: string }
}

function m(
  id: string,
  conversaId: string,
  tipo: TipoMensagem,
  direcao: DirecaoMensagem,
  conteudo: string,
  horario: string,
  status?: StatusMensagem,
  replyDe?: { id: string; texto: string }
): Mensagem {
  return { id, conversaId, tipo, direcao, conteudo, horario, status, replyDe }
}

export const MOCK_MENSAGENS: Record<string, Mensagem[]> = {
  "1": [
    m("1-1", "1", "texto", "recebida", "Olá! Vi que vocês trabalham com atacado. Vocês entregam em São Paulo?", "09:30"),
    m("1-2", "1", "texto", "enviada", "Sim! Entregamos em toda a Grande SP e região do ABCD. Em qual bairro você está?", "09:32", "lido"),
    m("1-3", "1", "texto", "recebida", "Estou no Brás. Tenho uma loja de utilidades domésticas.", "09:33"),
    m("1-4", "1", "texto", "enviada", "Perfeito! O pedido mínimo é de 10 caixas por produto. Posso te enviar nosso catálogo.", "09:35", "entregue"),
    m("1-5", "1", "texto", "recebida", "Oi! Quero fazer um pedido de 50 caixas de sabão em pó.", "09:42"),
    m("1-6", "1", "nota_interna", "enviada", "Cliente novo, veio pelo Instagram. Alta prioridade — compra de grande volume.", "09:43"),
  ],
  "2": [
    m("2-1", "2", "texto", "recebida", "Boa tarde! Preciso renovar o estoque de alguns itens.", "09:10"),
    m("2-2", "2", "texto", "enviada", "Boa tarde! Claro, pode mandar a lista.", "09:12", "lido"),
    m("2-3", "2", "imagem", "recebida", "lista-produtos.jpg", "09:15"),
    m("2-4", "2", "texto", "enviada", "Recebi! Vou verificar a disponibilidade e já te retorno.", "09:18", "lido"),
    m("2-5", "2", "texto", "recebida", "Quando chega o estoque de arroz parboilizado?", "09:31"),
  ],
  "3": [
    m("3-1", "3", "texto", "recebida", "Recebi o pedido, mas faltou o sabão líquido na caixa.", "08:50"),
    m("3-2", "3", "texto", "enviada", "Peço desculpas, João! Já estou verificando com o depósito.", "08:52", "lido"),
    m("3-3", "3", "nota_interna", "enviada", "Verificado: faltaram 12 unidades de sabão líquido no pedido #1247. Acionar logística.", "08:55"),
    m("3-4", "3", "texto", "enviada", "João, confirmado! Saiu uma reposição hoje. Chega amanhã de manhã, sem custo adicional.", "09:00", "lido", { id: "3-1", texto: "Recebi o pedido, mas faltou o sabão líquido na caixa." }),
    m("3-5", "3", "texto", "recebida", "Perfeito, obrigado pelo atendimento!", "09:15"),
  ],
  "4": [
    m("4-1", "4", "texto", "recebida", "Vocês entregam para o interior de São Paulo?", "08:58"),
    m("4-2", "4", "texto", "recebida", "Preciso de informações sobre o frete para Campinas.", "08:59"),
  ],
  "5": [
    m("5-1", "5", "texto", "enviada", "Bom dia! Seguem os preços atualizados para esta semana.", "08:20", "lido"),
    m("5-2", "5", "documento", "enviada", "catalogo-precos-dezembro.pdf", "08:22", "lido"),
    m("5-3", "5", "texto", "recebida", "Obrigado! Vou analisar e retorno.", "08:30"),
    m("5-4", "5", "texto", "recebida", "Preciso do catálogo atualizado com os preços de atacado para esta semana.", "08:47"),
  ],
  "6": [
    m("6-1", "6", "texto", "recebida", "Quero fazer um pedido de 100 caixas de óleo de soja.", "08:00"),
    m("6-2", "6", "texto", "enviada", "Perfeito! Posso separar. Qual o prazo para entrega?", "08:05", "lido"),
    m("6-3", "6", "texto", "recebida", "Até sexta-feira está bom.", "08:10"),
    m("6-4", "6", "texto", "enviada", "Confirmado! Vou enviar a nota fiscal em breve.", "08:15", "lido"),
    m("6-5", "6", "texto", "recebida", "Tudo certo! Vou aguardar a nota fiscal.", "08:30"),
  ],
  "7": [
    m("7-1", "7", "audio", "recebida", "0:28", "08:00"),
    m("7-2", "7", "texto", "enviada", "Ouvi o áudio! Temos açúcar cristal, sim. O saco de 50kg está R$ 189,90.", "08:05", "entregue"),
    m("7-3", "7", "texto", "recebida", "Tem açúcar cristal disponível? Quanto está o saco de 50kg?", "08:12"),
  ],
  "8": [
    m("8-1", "8", "texto", "recebida", "Boa tarde! Qual o prazo mínimo de entrega para minha região?", "Ontem"),
    m("8-2", "8", "texto", "enviada", "Boa tarde! Para a sua região é de 2 a 3 dias úteis.", "Ontem", "lido"),
  ],
  "9": [
    m("9-1", "9", "texto", "recebida", "Quero fazer um pedido grande este mês.", "Ontem"),
    m("9-2", "9", "texto", "enviada", "Que ótimo! Pode me passar a lista de produtos?", "Ontem", "lido"),
    m("9-3", "9", "documento", "recebida", "lista-pedido-dezembro.xlsx", "Ontem"),
    m("9-4", "9", "texto", "enviada", "Perfeito, recebi! Vou orçar e retorno até o fim do dia.", "Ontem", "lido"),
    m("9-5", "9", "texto", "recebida", "Fechado! Manda o boleto para o e-mail cadastrado.", "Ontem"),
  ],
  "10": [
    m("10-1", "10", "texto", "recebida", "Bom dia! Fiz um pedido semana passada e não chegou ainda.", "Ontem"),
    m("10-2", "10", "texto", "enviada", "Bom dia! Me passa o número do pedido que verifico.", "Ontem", "lido"),
    m("10-3", "10", "texto", "recebida", "Estou com dúvida sobre o pedido #2847, pode verificar?", "Ontem"),
  ],
  "11": [
    m("11-1", "11", "texto", "recebida", "Olá! Gostaria de saber mais sobre os produtos de limpeza.", "Seg"),
    m("11-2", "11", "texto", "enviada", "Olá! Temos uma linha completa. Posso enviar o catálogo.", "Seg", "enviado"),
    m("11-3", "11", "texto", "recebida", "Ok, aguardo o retorno.", "Seg"),
  ],
  "12": [
    m("12-1", "12", "texto", "recebida", "Boa tarde! Vocês trabalham com condição especial para grandes volumes?", "Seg"),
    m("12-2", "12", "texto", "enviada", "Sim! A partir de R$ 5.000 temos desconto progressivo. Posso detalhar.", "Seg", "lido"),
    m("12-3", "12", "texto", "recebida", "Pode mandar a proposta por aqui mesmo.", "Seg"),
  ],
  "13": [
    m("13-1", "13", "texto", "recebida", "Boa tarde, vi o anúncio de vocês no Instagram e quero saber mais.", "Seg"),
    m("13-2", "13", "texto", "recebida", "Vocês têm produtos de higiene pessoal também?", "Seg"),
  ],
  "14": [
    m("14-1", "14", "texto", "recebida", "Preciso de 200 caixas de tomate para esta semana, é possível?", "Sex"),
    m("14-2", "14", "texto", "enviada", "Sim! Temos em estoque. Posso garantir entrega até quinta.", "Sex", "lido"),
    m("14-3", "14", "texto", "recebida", "Perfeito! Pode fazer o pedido.", "Sex"),
    m("14-4", "14", "texto", "enviada", "Pedido registrado! Nota fiscal em breve.", "Sex", "lido"),
  ],
  "15": [
    m("15-1", "15", "texto", "recebida", "Quero fechar o pedido mensal. Valores do mês passado ainda valem?", "Sex"),
    m("15-2", "15", "texto", "enviada", "Sim, mantemos a tabela de outubro por mais uma semana!", "Sex", "lido"),
    m("15-3", "15", "texto", "recebida", "Combinado! Até amanhã então.", "Sex"),
  ],
  "16": [
    m("16-1", "16", "texto", "recebida", "Meu pedido chegou, mas algumas caixas vieram amassadas.", "Sex"),
    m("16-2", "16", "imagem", "recebida", "foto-caixas-danificadas.jpg", "Sex"),
    m("16-3", "16", "texto", "enviada", "Peço desculpas! Vou acionar o setor de qualidade.", "Sex", "entregue"),
    m("16-4", "16", "texto", "recebida", "Recebi o pedido, mas faltou 10 unidades do produto X.", "Sex"),
  ],
  "17": [
    m("17-1", "17", "texto", "recebida", "Qual a condição de pagamento para pedidos acima de R$ 10.000?", "Qui"),
    m("17-2", "17", "texto", "enviada", "Para pedidos acima de R$ 10k, oferecemos 30/60/90 dias sem juros.", "Qui", "enviado"),
  ],
  "18": [
    m("18-1", "18", "texto", "recebida", "Preciso falar com o gerente sobre minha conta.", "Qui"),
    m("18-2", "18", "texto", "enviada", "Claro! Vou transferir para o gerente Carlos.", "Qui", "lido"),
    m("18-3", "18", "texto", "recebida", "Tudo bem, vou aguardar o contato do gerente.", "Qui"),
  ],
  "19": [
    m("19-1", "19", "texto", "recebida", "Fechamos o trimestre com boas compras! Vocês têm programa de fidelidade?", "Qua"),
    m("19-2", "19", "texto", "enviada", "Sim! Clientes que compram mensalmente ganham desconto progressivo e frete grátis.", "Qua", "lido"),
    m("19-3", "19", "video", "enviada", "programa-fidelidade.mp4", "Qua", "lido"),
    m("19-4", "19", "texto", "recebida", "Perfeito, negócio fechado!", "Qua"),
  ],
  "20": [
    m("20-1", "20", "texto", "recebida", "Boa tarde! Quero fazer meu primeiro pedido com vocês.", "Ter"),
    m("20-2", "20", "texto", "enviada", "Seja bem-vinda! Qual tipo de produto você está buscando?", "Ter", "lido"),
  ],
}
