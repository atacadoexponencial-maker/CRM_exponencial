// Dados fixos do protótipo da B11-01. Nada aqui vem do banco, e esta pasta
// inteira sai do repositório na B11-05.

import {
  gatilhoDoFluxo,
  type Fluxo,
  type Repeticao,
  type ResultadoSimulacao,
  type Saida,
  type VerificacaoTipo,
} from "@/lib/fluxo-automacao"
import type { OpcoesEditor } from "../components/catalogo"
import type { ContatoTeste } from "../components/editor-fluxo"
import type { RegraListada } from "../components/lista-regras"

export const OPCOES_EXEMPLO: OpcoesEditor = {
  etiquetas: [
    { id: "et-interessado", nome: "Interessado", cor: "#22c55e" },
    { id: "et-vip", nome: "VIP", cor: "#eab308" },
    { id: "et-fora-horario", nome: "Fora do horário", cor: "#64748b" },
  ],
  atendentes: [
    { id: "at-carla", nome: "Carla" },
    { id: "at-diego", nome: "Diego" },
    { id: "at-renata", nome: "Renata" },
  ],
  tags: [
    { id: "vip", nome: "vip" },
    { id: "catalogo-enviado", nome: "catalogo-enviado" },
    { id: "qualificado", nome: "qualificado" },
  ],
  times: [
    { id: "time-expansao", nome: "Expansão" },
    { id: "time-retencao", nome: "Retenção" },
  ],
  sequencias: [
    { id: "seq-boas-vindas", nome: "Boas-vindas em 3 dias" },
    { id: "seq-recompra", nome: "Recompra 30 dias" },
  ],
  mensagensRapidas: [
    { id: "mr-catalogo", nome: "Catálogo atualizado" },
    { id: "mr-horario", nome: "Horário de atendimento" },
  ],
  numeros: [{ id: "num-principal", nome: "(11) 4000-1234" }],
}

const FLUXO_CATALOGO: Fluxo = {
  blocos: [
    { id: "g1", tipo: "gatilho", gatilho: "mensagem_recebida", parametros: {}, posicao: { x: 0, y: 0 } },
    {
      id: "c1",
      tipo: "condicao",
      verificacoes: [{ id: "v1", tipo: "texto_mensagem", operador: "contem", valor: "catálogo" }],
      posicao: { x: 0, y: 150 },
    },
    {
      id: "a1",
      tipo: "acao",
      acao: "aplicar_etiqueta",
      parametros: { label_id: "et-interessado" },
      posicao: { x: -170, y: 340 },
    },
    {
      id: "a2",
      tipo: "acao",
      acao: "enviar_midia",
      parametros: { arquivo: "catalogo-setembro.pdf" },
      posicao: { x: -170, y: 500 },
    },
    {
      id: "c2",
      tipo: "condicao",
      verificacoes: [{ id: "v2", tipo: "horario_comercial", operador: "fora", valor: "" }],
      posicao: { x: 170, y: 340 },
    },
    {
      id: "a3",
      tipo: "acao",
      acao: "enviar_mensagem",
      parametros: {
        texto:
          "Oi {{primeiro_nome}}! Nosso atendimento é de segunda a sexta, das 8h às 18h. Amanhã cedo alguém do time te responde.",
      },
      posicao: { x: 130, y: 540 },
    },
  ],
  ligacoes: [
    { de: "g1", saida: "proximo", para: "c1" },
    { de: "c1", saida: "sim", para: "a1" },
    { de: "a1", saida: "proximo", para: "a2" },
    { de: "c1", saida: "nao", para: "c2" },
    { de: "c2", saida: "sim", para: "a3" },
  ],
}

export type RegraExemplo = RegraListada & { repeticao: Repeticao }

export const REGRAS_EXEMPLO: RegraExemplo[] = [
  {
    id: "regra-catalogo",
    repeticao: { modo: "a_cada_horas", horas: 24 },
    nome: "Catálogo e ausência",
    ativa: true,
    fluxo: FLUXO_CATALOGO,
    execucoes7dias: 42,
    ultimaExecucao: "2026-09-30T14:32:00-03:00",
  },
  {
    id: "regra-boas-vindas",
    repeticao: { modo: "uma_vez_por_contato" },
    nome: "Boas-vindas",
    ativa: true,
    fluxo: {
      blocos: [
        { id: "g1", tipo: "gatilho", gatilho: "conversa_criada", parametros: {}, posicao: { x: 0, y: 0 } },
        {
          id: "a1",
          tipo: "acao",
          acao: "enviar_mensagem",
          parametros: { texto: "Olá {{primeiro_nome}}! Aqui é {{nome_vendedor}}, do Atacado Exponencial. Como posso ajudar?" },
          posicao: { x: 0, y: 160 },
        },
      ],
      ligacoes: [{ de: "g1", saida: "proximo", para: "a1" }],
    },
    execucoes7dias: 18,
    ultimaExecucao: "2026-09-29T09:05:00-03:00",
  },
  {
    id: "regra-qualificado",
    repeticao: { modo: "uma_vez_por_contato" },
    nome: "Lead qualificado vai para a Expansão",
    ativa: false,
    fluxo: {
      blocos: [
        {
          id: "g1",
          tipo: "gatilho",
          gatilho: "card_movido",
          parametros: { funil: "expansao", etapa: "em_qualificacao" },
          posicao: { x: 0, y: 0 },
        },
        { id: "a1", tipo: "acao", acao: "atribuir_time", parametros: { time_id: "time-expansao" }, posicao: { x: 0, y: 160 } },
        { id: "a2", tipo: "acao", acao: "adicionar_tag", parametros: { tag: "qualificado" }, posicao: { x: 0, y: 310 } },
      ],
      ligacoes: [
        { de: "g1", saida: "proximo", para: "a1" },
        { de: "a1", saida: "proximo", para: "a2" },
      ],
    },
    execucoes7dias: 0,
    ultimaExecucao: null,
  },
  {
    id: "regra-vip",
    repeticao: { modo: "uma_vez_por_contato" },
    nome: "Cliente VIP",
    ativa: true,
    fluxo: {
      blocos: [
        { id: "g1", tipo: "gatilho", gatilho: "tag_adicionada", parametros: { tag: "vip" }, posicao: { x: 0, y: 0 } },
        {
          id: "c1",
          tipo: "condicao",
          verificacoes: [{ id: "v1", tipo: "classificacao", operador: "e", valor: "ativo" }],
          posicao: { x: 0, y: 150 },
        },
        { id: "a1", tipo: "acao", acao: "aplicar_etiqueta", parametros: { label_id: "et-vip" }, posicao: { x: -170, y: 340 } },
        {
          id: "a2",
          tipo: "acao",
          acao: "enviar_mensagem",
          parametros: { texto: "{{primeiro_nome}}, agora você é cliente VIP! Condições especiais já valem no próximo pedido." },
          posicao: { x: -170, y: 500 },
        },
      ],
      ligacoes: [
        { de: "g1", saida: "proximo", para: "c1" },
        { de: "c1", saida: "sim", para: "a1" },
        { de: "a1", saida: "proximo", para: "a2" },
      ],
    },
    execucoes7dias: 3,
    ultimaExecucao: "2026-09-26T16:40:00-03:00",
  },
]

export const CONTATOS_TESTE: ContatoTeste[] = [
  { id: "ana", nome: "Ana Souza", descricao: "Escreveu \"Quero o CATÁLOGO\", às 10h. Cliente ativa, tag vip." },
  { id: "bruno", nome: "Bruno Lima", descricao: "Escreveu \"oi, tudo bem?\", às 22h. Lead." },
  { id: "carla", nome: "Carla Dias", descricao: "Escreveu \"bom dia\", às 10h. Lead." },
]

/**
 * Como cada contato de teste responderia a cada verificação, no sentido
 * "positivo" do operador (contém, é, tem, dentro do horário). Verificação sem
 * resposta aqui conta como verdadeira.
 */
const RESPOSTAS: Record<string, Partial<Record<VerificacaoTipo, boolean>>> = {
  ana: { texto_mensagem: true, horario_comercial: true, classificacao: true, tag_contato: true },
  bruno: { texto_mensagem: false, horario_comercial: false, classificacao: false, tag_contato: false },
  carla: { texto_mensagem: false, horario_comercial: true, classificacao: false, tag_contato: false },
}

const OPERADORES_NEGATIVOS = ["nao_contem", "nao_e", "nao_tem", "fora"]

/**
 * Simulação falsa, só para o protótipo mostrar o caminho no canvas. Quem avalia
 * de verdade é o motor da B11-02, no servidor.
 */
export async function simularExemplo(contatoId: string, fluxo: Fluxo): Promise<ResultadoSimulacao> {
  const respostas = RESPOSTAS[contatoId] ?? {}
  const resultado: ResultadoSimulacao = { blocos: [], saidas: {} }
  const vistos = new Set<string>()
  let atual = gatilhoDoFluxo(fluxo)?.id

  while (atual && !vistos.has(atual)) {
    const id: string = atual
    vistos.add(id)
    resultado.blocos.push(id)
    const bloco = fluxo.blocos.find((b) => b.id === id)
    let saida: Saida = "proximo"
    if (bloco?.tipo === "condicao") {
      const vale = bloco.verificacoes.every((v) => {
        const positivo = respostas[v.tipo] ?? true
        return OPERADORES_NEGATIVOS.includes(v.operador) ? !positivo : positivo
      })
      saida = vale ? "sim" : "nao"
      resultado.saidas[id] = saida
    }
    atual = fluxo.ligacoes.find((l) => l.de === id && l.saida === saida)?.para
  }
  return resultado
}
