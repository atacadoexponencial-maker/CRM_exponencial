// Modelos de automação (B59-02): automações prontas, iguais para todas as empresas,
// explicadas por anotações. Só dados e código puro: a galeria lê a lista no navegador,
// e o servidor monta a regra que o editor abre. "Usar modelo" nunca grava nada; o
// modelo vira automação no Salvar, como qualquer outra.

import type { Bloco, BlocoAnotacao, Fluxo, Ligacao, Repeticao } from "@/lib/fluxo-automacao"

export interface ModeloDeAutomacao {
  id: string
  titulo: string
  descricao: string
  repeticao: Repeticao
  fluxo: Fluxo
}

const nota = (id: string, x: number, y: number, texto: string): BlocoAnotacao => ({ id, tipo: "anotacao", texto, posicao: { x, y } })
const ligar = (de: string, saida: Ligacao["saida"], para: string): Ligacao => ({ de, saida, para })

// Colunas do desenho: o caminho no meio, a explicação geral à esquerda e a de cada bloco à direita
const X_GERAL = -340
const X_DA_NOTA = 300
const X_SIM = -170
const X_NAO = 170
const X_NOTA_SIM = 120

const publicoParaCampanha: Bloco[] = [
  { id: "gatilho", tipo: "gatilho", gatilho: "entrou_perfil_rfv", parametros: { destinos: "em_risco", hora: "9" }, posicao: { x: 0, y: 0 } },
  { id: "tag", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "campanha-reativacao" }, posicao: { x: 0, y: 260 } },
  nota(
    "nota-geral",
    X_GERAL,
    0,
    "O QUE ESTE MODELO FAZ\nMarca com uma tag quem entra em um perfil RFV, para formar o público de uma campanha.\n\nA automação não agenda o envio: ela prepara a lista. Quem envia é a tela de Campanhas.\n\nPARA ADAPTAR\nTroque o perfil no gatilho e o nome da tag. Depois clique em Salvar e ativar."
  ),
  nota(
    "nota-gatilho",
    X_DA_NOTA,
    0,
    "Dispara quando o contato muda para o perfil escolhido, no horário marcado.\n\nQuem já estava no perfil antes de ativar não entra sozinho: nesses contatos, aplique a tag à mão."
  ),
  nota(
    "nota-tag",
    X_DA_NOTA,
    260,
    "A tag separa quem vai receber a campanha. Use um nome por campanha, sem espaços, como campanha-natal."
  ),
  nota(
    "nota-campanha",
    X_DA_NOTA,
    520,
    "PARA AGENDAR O ENVIO\n1. Abra Campanhas > Nova campanha.\n2. No filtro, escolha Etiqueta e esta tag.\n3. Escreva a mensagem.\n4. Agende a data e a hora.\n\nNa API Oficial, a campanha usa template aprovado."
  ),
]

const moverLead: Bloco[] = [
  { id: "gatilho", tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao: { x: 0, y: 0 } },
  {
    id: "condicao",
    tipo: "condicao",
    verificacoes: [
      { id: "palavras", tipo: "texto_mensagem", operador: "contem_alguma", valor: "preço, valor, tabela, comprar, pedido" },
      { id: "etapa", tipo: "card_etapa", operador: "esta_em", valor: "entrada:lead" },
    ],
    posicao: { x: 0, y: 260 },
  },
  { id: "mover", tipo: "acao", acao: "mover_card", parametros: { funil: "entrada", etapa: "negociacao" }, posicao: { x: X_SIM, y: 560 } },
  nota(
    "nota-geral",
    X_GERAL,
    0,
    "O QUE ESTE MODELO FAZ\nQuando um lead pede preço, o card dele vai sozinho para Negociação, e o time vê quem está pronto para comprar.\n\nPARA ADAPTAR\nTroque as palavras na condição e a etapa no bloco Mover card. Depois clique em Salvar e ativar."
  ),
  nota("nota-gatilho", X_DA_NOTA, 0, "Roda a cada mensagem que o cliente envia. Quem filtra quais mensagens valem é a condição logo abaixo."),
  nota(
    "nota-condicao",
    X_DA_NOTA,
    260,
    "As duas verificações precisam valer.\n\nPalavras: separe por vírgula.\n\nEtapa: só move quem ainda está em Lead. Sem isso, um cliente mais à frente no funil, até em Ganho, voltaria para Negociação."
  ),
  nota(
    "nota-mover",
    X_NOTA_SIM,
    560,
    "Escolha o funil e a etapa de destino. Se trocar a etapa de origem na condição, confira se o destino ainda faz sentido."
  ),
]

const tagPorInteresse: Bloco[] = [
  { id: "gatilho", tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao: { x: 0, y: 0 } },
  {
    id: "condicao",
    tipo: "condicao",
    verificacoes: [{ id: "palavras", tipo: "texto_mensagem", operador: "contem_alguma", valor: "revenda, atacado, lojista" }],
    posicao: { x: 0, y: 260 },
  },
  { id: "tag", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "interesse-atacado" }, posicao: { x: X_SIM, y: 520 } },
  nota(
    "nota-geral",
    X_GERAL,
    0,
    "O QUE ESTE MODELO FAZ\nMarca o contato com uma tag quando a mensagem mostra um interesse, sem o atendente precisar lembrar.\n\nPARA ADAPTAR\nTroque as palavras na condição e o nome da tag. Depois clique em Salvar e ativar."
  ),
  nota("nota-gatilho", X_DA_NOTA, 0, "Roda a cada mensagem que o cliente envia. Quem filtra quais mensagens valem é a condição logo abaixo."),
  nota(
    "nota-condicao",
    X_DA_NOTA,
    260,
    "Escreva as palavras separadas por vírgula. Basta uma aparecer na mensagem para seguir pelo sim.\n\nNão há nada ligado no não: as outras mensagens não fazem nada."
  ),
  nota(
    "nota-tag",
    X_NOTA_SIM,
    520,
    "Use um nome sem espaços. Depois, encontre esses contatos com o filtro Etiqueta, em Contatos e em Campanhas."
  ),
]

const followUp: Bloco[] = [
  { id: "gatilho", tipo: "gatilho", gatilho: "card_movido", parametros: { funil: "entrada", etapa: "catalogo_enviado" }, posicao: { x: 0, y: 0 } },
  {
    id: "mensagem",
    tipo: "acao",
    acao: "enviar_mensagem",
    parametros: { texto: "Oi, {{primeiro_nome|tudo bem}}! Conseguiu dar uma olhada no catálogo? Se tiver alguma dúvida, é só me chamar." },
    posicao: { x: 0, y: 260 },
  },
  {
    id: "espera",
    tipo: "espera",
    tempo: { quantidade: "2", unidade: "dias" },
    recebeuMensagem: true,
    atendenteEnviou: false,
    limite: "30_dias",
    posicao: { x: 0, y: 520 },
  },
  {
    id: "lembrete",
    tipo: "acao",
    acao: "criar_lembrete",
    parametros: { texto: "{{primeiro_nome|O contato}} não respondeu ao follow-up do catálogo. Vale chamar de novo." },
    posicao: { x: X_SIM, y: 780 },
  },
  { id: "tag", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "respondeu-follow-up" }, posicao: { x: X_NAO, y: 780 } },
  nota(
    "nota-geral",
    X_GERAL,
    0,
    "O QUE ESTE MODELO FAZ\nDepois que o catálogo é enviado, manda uma mensagem e espera a resposta. Quem responde ganha uma tag; quem não responde vira um lembrete para o atendente.\n\nPARA ADAPTAR\nTroque a etapa no gatilho, o texto da mensagem e o prazo da espera. Depois clique em Salvar e ativar."
  ),
  nota("nota-gatilho", X_DA_NOTA, 0, "Dispara quando o card entra em Catálogo Enviado, uma vez por contato. Para usar em outro momento do funil, troque a etapa aqui."),
  nota(
    "nota-mensagem",
    X_DA_NOTA,
    260,
    "Reescreva com o jeito da sua empresa. O nome do cliente entra sozinho.\n\nNa API Oficial, a Meta só aceita este texto até 24 horas depois da última mensagem do cliente."
  ),
  nota(
    "nota-espera",
    X_DA_NOTA,
    520,
    "O contato segue pelo que acontecer primeiro: se responder, vai para a tag; se o prazo acabar, vai para o lembrete.\n\nMude o prazo neste bloco. O padrão é 2 dias."
  ),
  nota(
    "nota-lembrete",
    X_SIM - 90,
    1000,
    "Saída do tempo: ninguém respondeu. O lembrete cai na Agenda do responsável pela conversa. Dá para trocar o texto e a pessoa neste bloco."
  ),
  nota(
    "nota-tag",
    X_NAO + 40,
    1000,
    "Saída da mensagem: o contato respondeu. Troque a tag ou ligue outra ação, como mover o card para Negociação."
  ),
]

const boasVindas: Bloco[] = [
  { id: "gatilho", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } },
  {
    id: "condicao",
    tipo: "condicao",
    verificacoes: [{ id: "horario", tipo: "horario_comercial", operador: "dentro", valor: "" }],
    posicao: { x: 0, y: 260 },
  },
  {
    id: "dentro",
    tipo: "acao",
    acao: "enviar_mensagem",
    parametros: { texto: "Oi, {{primeiro_nome|tudo bem}}! Recebemos sua mensagem e já vamos te atender." },
    posicao: { x: X_SIM, y: 520 },
  },
  {
    id: "fora",
    tipo: "acao",
    acao: "enviar_mensagem",
    parametros: { texto: "Oi, {{primeiro_nome|tudo bem}}! Nosso time está fora do horário agora. Assim que voltarmos, respondemos por aqui." },
    posicao: { x: X_NAO, y: 520 },
  },
  nota(
    "nota-geral",
    X_GERAL,
    0,
    "O QUE ESTE MODELO FAZ\nResponde a primeira mensagem de quem chega, com um texto dentro do horário comercial e outro fora dele.\n\nPARA ADAPTAR\nConfira o horário comercial e troque os dois textos. Depois clique em Salvar e ativar."
  ),
  nota("nota-gatilho", X_DA_NOTA, 0, "Dispara quando uma conversa nova é criada, uma vez por contato. Quem já conversou não recebe de novo."),
  nota(
    "nota-condicao",
    X_DA_NOTA,
    260,
    "Confere o horário da empresa. Para ajustar, volte à lista de Automações e clique em Horário comercial."
  ),
  nota("nota-dentro", X_SIM - 90, 740, "Saída sim: dentro do horário. Reescreva com o jeito da sua empresa. O nome do cliente entra sozinho."),
  nota("nota-fora", X_NAO + 40, 740, "Saída não: fora do horário. Diga quando o time volta, se for sempre o mesmo horário."),
]

export const MODELOS: readonly ModeloDeAutomacao[] = [
  {
    id: "publico-para-campanha",
    titulo: "Preparar público para campanha",
    descricao: "Marca com uma tag quem entra em um perfil RFV e ensina a agendar o envio em massa em Campanhas.",
    repeticao: { modo: "sempre" },
    fluxo: { blocos: publicoParaCampanha, ligacoes: [ligar("gatilho", "proximo", "tag")] },
  },
  {
    id: "mover-lead-que-pediu-preco",
    titulo: "Mover lead que pediu preço",
    descricao: "Leva o card para Negociação quando um lead pergunta preço, valor ou tabela.",
    repeticao: { modo: "sempre" },
    fluxo: { blocos: moverLead, ligacoes: [ligar("gatilho", "proximo", "condicao"), ligar("condicao", "sim", "mover")] },
  },
  {
    id: "tag-por-interesse",
    titulo: "Tag automática por interesse",
    descricao: "Adiciona uma tag quando a mensagem do contato mostra um interesse, como revenda ou atacado.",
    repeticao: { modo: "sempre" },
    fluxo: { blocos: tagPorInteresse, ligacoes: [ligar("gatilho", "proximo", "condicao"), ligar("condicao", "sim", "tag")] },
  },
  {
    id: "follow-up-sem-resposta",
    titulo: "Follow-up sem resposta",
    descricao: "Envia uma mensagem depois do catálogo e espera: quem responde ganha uma tag; quem não responde vira lembrete na Agenda.",
    repeticao: { modo: "uma_vez_por_contato" },
    fluxo: {
      blocos: followUp,
      ligacoes: [
        ligar("gatilho", "proximo", "mensagem"),
        ligar("mensagem", "proximo", "espera"),
        ligar("espera", "tempo", "lembrete"),
        ligar("espera", "recebeu_mensagem", "tag"),
      ],
    },
  },
  {
    id: "boas-vindas-por-horario",
    titulo: "Boas-vindas por horário",
    descricao: "Responde a conversa nova com um texto dentro do horário comercial e outro fora dele.",
    repeticao: { modo: "uma_vez_por_contato" },
    fluxo: {
      blocos: boasVindas,
      ligacoes: [ligar("gatilho", "proximo", "condicao"), ligar("condicao", "sim", "dentro"), ligar("condicao", "nao", "fora")],
    },
  },
]

export function modeloPorId(id: string): ModeloDeAutomacao | undefined {
  return MODELOS.find((m) => m.id === id)
}
