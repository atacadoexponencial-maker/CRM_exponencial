// Frases em português para o que o fluxo faz: uma por bloco, no canvas, e um
// resumo da regra inteira, na lista.

import type { Bloco, BlocoAcao, BlocoGatilho, Fluxo, Repeticao, Verificacao } from "@/lib/fluxo-automacao"
import { SEQUENCIA_DA_ETAPA, gatilhoDoFluxo, vencimentoDoLembrete } from "@/lib/fluxo-automacao"
import {
  ACOES,
  FUNIS,
  GATILHOS,
  NAO_EXISTE_MAIS,
  VERIFICACOES,
  etapasDoFunil,
  opcoesDaFonte,
  opcoesDoCampoContato,
  rotuloCampoContato,
  type Opcao,
  type OpcoesEditor,
} from "./catalogo"

const nomeEm = (lista: Opcao[], id: string | undefined) => lista.find((o) => o.id === id)?.nome ?? id ?? ""

/** Nas listas da empresa, a escolha apagada aparece como "(não existe mais)", e não pelo id (B22-27). */
const nomeOuApagado = (lista: Opcao[], id: string | undefined) =>
  lista.find((o) => o.id === id)?.nome ?? (id ? NAO_EXISTE_MAIS : "")

const trecho = (texto: string, max = 60) => (texto.length > max ? `${texto.slice(0, max)}…` : texto)

const plural = (n: number, singular: string, varios: string) => `${n} ${n === 1 ? singular : varios}`

function valorDoCampo(campo: string | undefined, valor: string | undefined, opcoes: OpcoesEditor): string {
  const lista = opcoesDoCampoContato(campo, opcoes)
  return lista ? nomeEm(lista, valor) : (valor ?? "")
}

/** A proteção de repetição, na linha de baixo do bloco do gatilho (B22-09). */
export function fraseRepeticao(repeticao: Repeticao): string {
  switch (repeticao.modo) {
    case "uma_vez_por_contato":
      return "Repetição: uma vez por contato"
    case "a_cada_horas":
      return `Repetição: no máximo a cada ${plural(repeticao.horas, "hora", "horas")}`
    case "sempre":
      return "Repetição: sempre"
  }
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
      return p.tag ? `Quando a tag "${p.tag}" for adicionada` : "Quando qualquer tag for adicionada"
    case "etiqueta_aplicada":
      return p.label_id
        ? `Quando a etiqueta "${nomeOuApagado(opcoes.etiquetas, p.label_id)}" for aplicada`
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
  if (item.valor.tipo === "opcoes") valor = nomeOuApagado(opcoesDaFonte(item.valor.fonte, opcoes), v.valor)
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
      return p.mensagem_rapida_id ? `Enviar a mensagem rápida "${nomeOuApagado(opcoes.mensagensRapidas, p.mensagem_rapida_id)}"` : rotulo
    case "enviar_midia":
      return p.arquivo ? `Enviar ${p.arquivo_tipo === "imagem" ? "a imagem" : "o documento"} "${p.arquivo_nome || "arquivo"}"` : rotulo
    case "adicionar_tag":
      return p.tag ? `Adicionar a tag "${p.tag}"` : rotulo
    case "remover_tag":
      return p.tag ? `Remover a tag "${p.tag}"` : rotulo
    case "aplicar_etiqueta":
      return p.label_id ? `Aplicar a etiqueta "${nomeOuApagado(opcoes.etiquetas, p.label_id)}"` : rotulo
    case "remover_etiqueta":
      return p.label_id ? `Remover a etiqueta "${nomeOuApagado(opcoes.etiquetas, p.label_id)}"` : rotulo
    case "alterar_dado_contato":
      if (!p.campo) return rotulo
      // B22-34: sem valor ainda, a frase diz o que falta, e não `= ""`
      if (!p.valor) return `Alterar ${rotuloCampoContato(p.campo).toLowerCase()} do contato`
      if (p.campo === "observacoes") return `Acrescentar às observações: "${trecho(p.valor, 40)}"`
      return `${rotuloCampoContato(p.campo)} do contato = "${valorDoCampo(p.campo, p.valor, opcoes)}"`
    case "atribuir_atendente":
      return p.atendente_id ? `Atribuir a ${nomeOuApagado(opcoes.atendentes, p.atendente_id)}` : rotulo
    case "atribuir_time":
      return p.time_id ? `Atribuir ao time ${nomeOuApagado(opcoes.times, p.time_id)}` : rotulo
    case "mover_card": {
      if (!p.funil || !p.etapa) return rotulo
      const destino = `Mover card para "${nomeEm(etapasDoFunil(p.funil), p.etapa)}" (${nomeEm(FUNIS, p.funil)})`
      const comSequencia = p.iniciar_sequencia === "sim" && SEQUENCIA_DA_ETAPA[`${p.funil}:${p.etapa}`]
      return comSequencia ? `${destino} e iniciar a sequência` : destino
    }
    case "iniciar_sequencia":
      return p.sequencia_id ? `Iniciar a sequência "${nomeOuApagado(opcoes.sequencias, p.sequencia_id)}"` : rotulo
    case "resolver_conversa":
    case "reabrir_conversa":
      return rotulo
    case "criar_lembrete": {
      if (!p.texto) return rotulo
      const para = p.responsavel_id ? nomeOuApagado(opcoes.atendentes, p.responsavel_id) : "o responsável"
      const vencimento = vencimentoDoLembrete(p)
      const quando =
        !vencimento || vencimento.quantidade === 0
          ? ""
          : `, vence em ${plural(vencimento.quantidade, vencimento.unidade === "horas" ? "hora" : "dia", vencimento.unidade)}`
      return `Lembrete para ${para}: "${trecho(p.texto, 40)}"${quando}`
    }
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
      return `Etiqueta "${opcoes ? nomeOuApagado(opcoes.etiquetas, evento.labelId) : evento.labelId}" aplicada`
    case "dado_contato_alterado": {
      const campo = rotuloCampoContato(evento.campo)
      if (!evento.valor) return `${campo} apagado`
      return `${campo} mudou para "${opcoes ? valorDoCampo(evento.campo, evento.valor, opcoes) : evento.valor}"`
    }
    case "mensagem_recebida":
    case "mensagem_enviada_time": {
      const inicio = evento.tipo === "mensagem_recebida" ? "Mensagem recebida" : "Mensagem do time"
      // Mídia sem legenda não tem texto: o tipo diz o que foi
      if (evento.texto) return `${inicio}: "${trecho(evento.texto)}"`
      const tipo = opcoes ? nomeEm(opcoesDaFonte("tiposMensagem", opcoes), evento.tipoMensagem) : evento.tipoMensagem
      return tipo ? `${inicio} (${tipo.toLowerCase()})` : inicio
    }
    default:
      return GATILHOS[evento.tipo as keyof typeof GATILHOS]?.rotulo ?? evento.tipo ?? "Evento"
  }
}
