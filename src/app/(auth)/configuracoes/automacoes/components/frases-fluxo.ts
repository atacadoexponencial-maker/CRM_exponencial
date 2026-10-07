// Frases em português para o que o fluxo faz: uma por bloco, no canvas, e um
// resumo da regra inteira, na lista.

import type { Bloco, BlocoAcao, BlocoGatilho, Fluxo, Verificacao } from "@/lib/fluxo-automacao"
import { SEQUENCIA_DA_ETAPA, gatilhoDoFluxo } from "@/lib/fluxo-automacao"
import {
  ACOES,
  FUNIS,
  GATILHOS,
  VERIFICACOES,
  etapasDoFunil,
  opcoesDaFonte,
  opcoesDoCampoContato,
  rotuloCampoContato,
  type Opcao,
  type OpcoesEditor,
} from "./catalogo"

const nomeEm = (lista: Opcao[], id: string | undefined) => lista.find((o) => o.id === id)?.nome ?? id ?? ""

const trecho = (texto: string, max = 60) => (texto.length > max ? `${texto.slice(0, max)}…` : texto)

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`

function valorDoCampo(campo: string | undefined, valor: string | undefined, opcoes: OpcoesEditor): string {
  const lista = opcoesDoCampoContato(campo, opcoes)
  return lista ? nomeEm(lista, valor) : (valor ?? "")
}

export function fraseGatilho(bloco: BlocoGatilho, opcoes: OpcoesEditor): string {
  const p = bloco.parametros
  switch (bloco.gatilho) {
    case "mensagem_recebida":
      return "Quando o cliente enviar mensagem"
    case "mensagem_enviada_time":
      return "Quando alguém do time enviar mensagem"
    case "conversa_criada":
      return "Quando uma conversa for criada"
    case "card_movido": {
      if (!p.funil) return "Quando um card mudar de etapa"
      const funil = nomeEm(FUNIS, p.funil)
      return p.etapa
        ? `Quando o card entrar em "${nomeEm(etapasDoFunil(p.funil), p.etapa)}" (${funil})`
        : `Quando o card mudar de etapa no ${funil}`
    }
    case "tag_adicionada":
      return p.tag ? `Quando a tag "${nomeEm(opcoes.tags, p.tag)}" for adicionada` : "Quando qualquer tag for adicionada"
    case "etiqueta_aplicada":
      return p.label_id
        ? `Quando a etiqueta "${nomeEm(opcoes.etiquetas, p.label_id)}" for aplicada`
        : "Quando qualquer etiqueta for aplicada"
    case "dado_contato_alterado": {
      if (!p.campo) return "Quando um dado do contato mudar"
      const campo = rotuloCampoContato(p.campo).toLowerCase()
      return p.valor
        ? `Quando ${campo} do contato mudar para "${valorDoCampo(p.campo, p.valor, opcoes)}"`
        : `Quando ${campo} do contato mudar`
    }
  }
}

export function fraseVerificacao(v: Verificacao, opcoes: OpcoesEditor): string {
  const item = VERIFICACOES[v.tipo]
  const operador = nomeEm(item.operadores, v.operador)
  if (item.valor.tipo === "nenhum" || v.operador === "sem_atendente") {
    return v.tipo === "horario_comercial" ? operador : `${item.rotulo.toLowerCase()} ${operador}`
  }
  let valor = v.valor
  if (item.valor.tipo === "opcoes") valor = nomeEm(opcoesDaFonte(item.valor.fonte, opcoes), v.valor)
  if (item.valor.tipo === "funil_etapa") {
    const [funil, etapa] = v.valor.split(":")
    valor = funil ? `${nomeEm(etapasDoFunil(funil), etapa)} (${nomeEm(FUNIS, funil)})` : ""
  }
  return `${item.rotulo.toLowerCase()} ${operador} "${valor || "…"}"`
}

export function fraseAcao(bloco: BlocoAcao, opcoes: OpcoesEditor): string {
  const p = bloco.parametros
  const rotulo = ACOES[bloco.acao].rotulo
  switch (bloco.acao) {
    case "enviar_mensagem":
      return p.texto ? `Enviar: "${trecho(p.texto)}"` : rotulo
    case "enviar_mensagem_rapida":
      return p.mensagem_rapida_id ? `Enviar a mensagem rápida "${nomeEm(opcoes.mensagensRapidas, p.mensagem_rapida_id)}"` : rotulo
    case "enviar_midia":
      return p.arquivo ? `Enviar o arquivo ${p.arquivo}` : rotulo
    case "adicionar_tag":
      return p.tag ? `Adicionar a tag "${nomeEm(opcoes.tags, p.tag)}"` : rotulo
    case "remover_tag":
      return p.tag ? `Remover a tag "${nomeEm(opcoes.tags, p.tag)}"` : rotulo
    case "aplicar_etiqueta":
      return p.label_id ? `Aplicar a etiqueta "${nomeEm(opcoes.etiquetas, p.label_id)}"` : rotulo
    case "remover_etiqueta":
      return p.label_id ? `Remover a etiqueta "${nomeEm(opcoes.etiquetas, p.label_id)}"` : rotulo
    case "alterar_dado_contato":
      if (!p.campo) return rotulo
      if (p.campo === "observacoes") return `Acrescentar às observações: "${trecho(p.valor ?? "", 40)}"`
      return `${rotuloCampoContato(p.campo)} do contato = "${valorDoCampo(p.campo, p.valor, opcoes)}"`
    case "atribuir_atendente":
      return p.atendente_id ? `Atribuir a ${nomeEm(opcoes.atendentes, p.atendente_id)}` : rotulo
    case "atribuir_time":
      return p.time_id ? `Atribuir ao time ${nomeEm(opcoes.times, p.time_id)}` : rotulo
    case "mover_card": {
      if (!p.funil || !p.etapa) return rotulo
      const destino = `Mover card para "${nomeEm(etapasDoFunil(p.funil), p.etapa)}" (${nomeEm(FUNIS, p.funil)})`
      const comSequencia = p.iniciar_sequencia === "sim" && SEQUENCIA_DA_ETAPA[`${p.funil}:${p.etapa}`]
      return comSequencia ? `${destino} e iniciar a sequência` : destino
    }
    case "iniciar_sequencia":
      return p.sequencia_id ? `Iniciar a sequência "${nomeEm(opcoes.sequencias, p.sequencia_id)}"` : rotulo
    case "resolver_conversa":
    case "reabrir_conversa":
      return rotulo
  }
}

export function fraseBloco(bloco: Bloco, opcoes: OpcoesEditor): string {
  if (bloco.tipo === "gatilho") return fraseGatilho(bloco, opcoes)
  if (bloco.tipo === "acao") return fraseAcao(bloco, opcoes)
  if (bloco.verificacoes.length === 0) return "Nenhuma verificação"
  const frase = bloco.verificacoes.map((v) => fraseVerificacao(v, opcoes)).join(" e ")
  return `Se ${frase}`
}

/** "Quando o cliente enviar mensagem → 2 condições, 3 ações" */
export function resumoRegra(fluxo: Fluxo, opcoes: OpcoesEditor): string {
  const gatilho = gatilhoDoFluxo(fluxo)
  const inicio = gatilho ? fraseGatilho(gatilho, opcoes) : "Sem gatilho"
  const condicoes = fluxo.blocos.filter((b) => b.tipo === "condicao").length
  const acoes = fluxo.blocos.filter((b) => b.tipo === "acao").length
  const partes = [condicoes > 0 ? plural(condicoes, "condição", "condições") : null, plural(acoes, "ação", "ações")]
  return `${inicio} → ${partes.filter(Boolean).join(", ")}`
}

/** O que aconteceu numa execução do histórico: "Card entrou em "Sondagem" (Funil de Entrada)". */
export function fraseDoEvento(evento: Record<string, string>, opcoes?: OpcoesEditor): string {
  switch (evento.tipo) {
    case "card_movido": {
      const etapa = evento.funil ? nomeEm(etapasDoFunil(evento.funil), evento.etapa) : evento.etapa
      return `Card entrou em "${etapa}" (${nomeEm(FUNIS, evento.funil)})`
    }
    case "conversa_criada":
      return "Conversa criada"
    case "tag_adicionada":
      return `Tag "${evento.tag}" adicionada`
    case "etiqueta_aplicada":
      return `Etiqueta "${opcoes ? nomeEm(opcoes.etiquetas, evento.labelId) : evento.labelId}" aplicada`
    case "dado_contato_alterado": {
      const campo = rotuloCampoContato(evento.campo)
      if (!evento.valor) return `${campo} apagado`
      return `${campo} mudou para "${opcoes ? valorDoCampo(evento.campo, evento.valor, opcoes) : evento.valor}"`
    }
    default:
      return GATILHOS[evento.tipo as keyof typeof GATILHOS]?.rotulo ?? evento.tipo ?? "Evento"
  }
}
