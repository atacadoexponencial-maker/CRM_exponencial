// B37-01: filtro avançado da lista de contatos.
//
// O filtro é uma lista de grupos; cada grupo, uma lista de condições. As condições
// de um grupo se juntam por E ou OU, e os grupos entre si também (um nível só, sem
// grupo dentro de grupo). Quem filtra de verdade é o banco (`filtrar_contatos`, que
// tem o mesmo catálogo de campos e comparações): este arquivo descreve o que a tela
// oferece e valida, no servidor, o que chega dela.

import { z } from "zod"
import { CLASSIFICACAO_LABEL, TIPO_LABEL, ICP_LABEL } from "@/app/(auth)/contatos/mock-contatos"
import { UFS } from "@/lib/uf"

export type Juncao = "e" | "ou"

export type TipoDeCampo = "texto" | "lista" | "data"

export type Comparacao =
  | "contem"
  | "nao_contem"
  | "igual"
  | "e"
  | "nao_e"
  | "qualquer_de"
  | "antes"
  | "depois"
  | "entre"
  | "ultimos_dias"
  | "ha_mais_de_dias"
  | "vazio"
  | "nao_vazio"

export interface Condicao {
  campo: string
  comparacao: Comparacao | ""
  /** Um valor, dois em "entre", vários em "é qualquer um de", nenhum em "está vazio". */
  valores: string[]
}

export interface Grupo {
  juncao: Juncao
  condicoes: Condicao[]
}

export interface Filtro {
  juncao: Juncao
  grupos: Grupo[]
}

export type Opcao = { valor: string; rotulo: string }

export interface CampoDoFiltro {
  id: string
  rotulo: string
  /** Assunto em que o campo aparece na lista (B37-02 acrescenta Etiquetas, Compras e Funil). */
  assunto: "Cadastro"
  tipo: TipoDeCampo
  /** Coluna de `contacts` que o campo lê. */
  coluna: string
  /** Obrigatório no cadastro: sem "está vazio" nem "não está vazio" (CA-B37-36). */
  obrigatorio: boolean
  /** Opções fixas de um campo de lista. Sem elas, as opções vêm do servidor (nicho, atendente). */
  opcoes?: Opcao[]
}

const opcoesDe = (rotulos: Record<string, string>): Opcao[] =>
  Object.entries(rotulos).map(([valor, rotulo]) => ({ valor, rotulo }))

export const CAMPOS_DO_FILTRO: CampoDoFiltro[] = [
  { id: "nome", rotulo: "Nome", assunto: "Cadastro", tipo: "texto", coluna: "name", obrigatorio: false },
  { id: "telefone", rotulo: "Telefone", assunto: "Cadastro", tipo: "texto", coluna: "phone_number", obrigatorio: true },
  {
    id: "classificacao", rotulo: "Classificação", assunto: "Cadastro", tipo: "lista", coluna: "classificacao",
    obrigatorio: true, opcoes: opcoesDe(CLASSIFICACAO_LABEL),
  },
  { id: "tipo", rotulo: "Tipo", assunto: "Cadastro", tipo: "lista", coluna: "tipo", obrigatorio: false, opcoes: opcoesDe(TIPO_LABEL) },
  { id: "nicho", rotulo: "Nicho", assunto: "Cadastro", tipo: "lista", coluna: "nicho", obrigatorio: false },
  { id: "cidade", rotulo: "Cidade", assunto: "Cadastro", tipo: "texto", coluna: "cidade", obrigatorio: false },
  {
    id: "uf", rotulo: "UF", assunto: "Cadastro", tipo: "lista", coluna: "uf", obrigatorio: false,
    opcoes: UFS.map((u) => ({ valor: u.sigla, rotulo: `${u.sigla} — ${u.nome}` })),
  },
  {
    id: "icp", rotulo: "Perfil de cliente", assunto: "Cadastro", tipo: "lista", coluna: "icp", obrigatorio: false,
    opcoes: opcoesDe(ICP_LABEL),
  },
  { id: "atendente", rotulo: "Atendente", assunto: "Cadastro", tipo: "lista", coluna: "atendente_id", obrigatorio: false },
  { id: "observacoes", rotulo: "Observações", assunto: "Cadastro", tipo: "texto", coluna: "observacoes", obrigatorio: false },
  { id: "data_cadastro", rotulo: "Data de cadastro", assunto: "Cadastro", tipo: "data", coluna: "created_at", obrigatorio: true },
]

/**
 * Colunas de `contacts` que ficam fora do filtro de propósito. Coluna nova no
 * contato precisa entrar no catálogo ou aqui, senão o teste do CA-B37-04 falha.
 */
export const COLUNAS_FORA_DO_FILTRO = [
  "id",
  "workspace_id",
  "excluido_em",
  "excluido_por",
  "photo_path",
  "photo_checked_at",
] as const

export const ROTULO_DA_COMPARACAO: Record<Comparacao, string> = {
  contem: "contém",
  nao_contem: "não contém",
  igual: "é igual a",
  e: "é",
  nao_e: "não é",
  qualquer_de: "é qualquer um de",
  antes: "antes de",
  depois: "depois de",
  entre: "entre",
  ultimos_dias: "nos últimos N dias",
  ha_mais_de_dias: "há mais de N dias",
  vazio: "está vazio",
  nao_vazio: "não está vazio",
}

const COMPARACOES_DO_TIPO: Record<TipoDeCampo, Comparacao[]> = {
  texto: ["contem", "nao_contem", "igual", "vazio", "nao_vazio"],
  lista: ["e", "nao_e", "qualquer_de", "vazio", "nao_vazio"],
  data: ["antes", "depois", "entre", "ultimos_dias", "ha_mais_de_dias", "vazio", "nao_vazio"],
}

export function campoDoFiltro(id: string): CampoDoFiltro | undefined {
  return CAMPOS_DO_FILTRO.find((c) => c.id === id)
}

/** Comparações que o campo oferece; campo obrigatório não tem "está vazio". */
export function comparacoesDoCampo(campo: CampoDoFiltro): Comparacao[] {
  const todas = COMPARACOES_DO_TIPO[campo.tipo]
  return campo.obrigatorio ? todas.filter((c) => c !== "vazio" && c !== "nao_vazio") : todas
}

/** Rótulo da comparação; em data, "está vazio" vira "está vazia". */
export function rotuloDaComparacao(campo: CampoDoFiltro, comparacao: Comparacao): string {
  if (campo.tipo === "data" && comparacao === "vazio") return "está vazia"
  if (campo.tipo === "data" && comparacao === "nao_vazio") return "não está vazia"
  return ROTULO_DA_COMPARACAO[comparacao]
}

/** Quantos valores a comparação pede. */
export function valoresPedidos(comparacao: Comparacao): "nenhum" | "um" | "dois" | "varios" {
  if (comparacao === "vazio" || comparacao === "nao_vazio") return "nenhum"
  if (comparacao === "entre") return "dois"
  if (comparacao === "qualquer_de") return "varios"
  return "um"
}

const DATA = /^\d{4}-\d{2}-\d{2}$/
const DIAS = /^\d{1,5}$/

function valorValido(campo: CampoDoFiltro, comparacao: Comparacao, valor: string): boolean {
  if (!valor.trim()) return false
  if (campo.id === "telefone") return valor.replace(/\D/g, "").length > 0
  if (comparacao === "ultimos_dias" || comparacao === "ha_mais_de_dias") return DIAS.test(valor) && Number(valor) > 0
  if (campo.tipo === "data") return DATA.test(valor) && !Number.isNaN(Date.parse(valor))
  if (campo.opcoes) return campo.opcoes.some((o) => o.valor === valor)
  return true
}

/** A condição tem campo, comparação do campo e os valores que a comparação pede. */
export function condicaoCompleta(condicao: Condicao): boolean {
  const campo = campoDoFiltro(condicao.campo)
  if (!campo || !condicao.comparacao) return false
  if (!comparacoesDoCampo(campo).includes(condicao.comparacao)) return false
  const comparacao = condicao.comparacao
  const valores = condicao.valores
  switch (valoresPedidos(comparacao)) {
    case "nenhum":
      return true
    case "um":
      return valores.length >= 1 && valorValido(campo, comparacao, valores[0])
    case "dois":
      return valores.length >= 2 && valorValido(campo, comparacao, valores[0]) && valorValido(campo, comparacao, valores[1])
    case "varios":
      return valores.length >= 1 && valores.every((v) => valorValido(campo, comparacao, v))
  }
}

/** Deixa só o que filtra: tira condições incompletas e grupos que ficaram vazios (CA-B37-13). */
export function limparFiltro(filtro: Filtro): Filtro {
  return {
    juncao: filtro.juncao,
    grupos: filtro.grupos
      .map((g) => ({
        juncao: g.juncao,
        condicoes: g.condicoes.filter(condicaoCompleta).map(paraOBanco),
      }))
      .filter((g) => g.condicoes.length > 0),
  }
}

/** No telefone, só os dígitos contam (QA M29): "(11) 9" procura "119". */
function paraOBanco(condicao: Condicao): Condicao {
  const valores = condicao.valores.slice(0, valoresPedidos(condicao.comparacao as Comparacao) === "varios" ? undefined : 2)
  if (condicao.campo === "telefone") return { ...condicao, valores: valores.map((v) => v.replace(/\D/g, "")) }
  return { ...condicao, valores: valores.map((v) => v.trim()) }
}

/** Condições completas: o número do botão "Filtrar · K". */
export function contarCondicoes(filtro: Filtro): number {
  return filtro.grupos.reduce((total, g) => total + g.condicoes.filter(condicaoCompleta).length, 0)
}

export const FILTRO_VAZIO: Filtro = { juncao: "e", grupos: [] }

const esquemaCondicao = z.object({
  campo: z.string().max(40),
  comparacao: z.string().max(20),
  valores: z.array(z.string().max(200)).max(100),
})

/**
 * O que o servidor aceita da tela. Campo ou comparação fora do catálogo, ou valor
 * de tipo errado, recusa o filtro inteiro; condição só incompleta é descartada.
 */
export const esquemaFiltro = z
  .object({
    juncao: z.enum(["e", "ou"]),
    grupos: z
      .array(z.object({ juncao: z.enum(["e", "ou"]), condicoes: z.array(esquemaCondicao).max(30) }))
      .max(20),
  })
  .superRefine((filtro, ctx) => {
    for (const grupo of filtro.grupos) {
      for (const condicao of grupo.condicoes) {
        const campo = campoDoFiltro(condicao.campo)
        if (!campo) {
          ctx.addIssue({ code: "custom", message: `Campo desconhecido: ${condicao.campo}` })
          continue
        }
        if (condicao.comparacao && !comparacoesDoCampo(campo).includes(condicao.comparacao as Comparacao)) {
          ctx.addIssue({ code: "custom", message: `Comparação inválida para ${campo.rotulo}` })
        }
      }
    }
  })

/** Botões fixos da lista (classificação, tipo, nicho, atendente): valem junto com o filtro. */
export const esquemaRapidos = z
  .array(
    z.object({
      campo: z.enum(["classificacao", "tipo", "nicho", "atendente"]),
      comparacao: z.literal("e"),
      valores: z.array(z.string().min(1).max(200)).length(1),
    })
  )
  .max(4)
