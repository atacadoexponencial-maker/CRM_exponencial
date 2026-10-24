// B37-01: filtro avançado da lista de contatos.
//
// O filtro é uma lista de grupos; cada grupo, uma lista de condições. As condições
// de um grupo se juntam por E ou OU, e os grupos entre si também (um nível só, sem
// grupo dentro de grupo). Quem filtra de verdade é o banco (`filtrar_contatos`, que
// tem o mesmo catálogo de campos e comparações): este arquivo descreve o que a tela
// oferece e valida, no servidor, o que chega dela.
//
// B37-02: além do cadastro, etiquetas, compras e etapa do funil. Esses campos não
// são colunas de `contacts` (ficam em `CAMPOS_LIGADOS`); o banco os calcula.

import { z } from "zod"
import { CLASSIFICACAO_LABEL, TIPO_LABEL, ICP_LABEL } from "@/app/(auth)/contatos/mock-contatos"
import { ETAPAS_ENTRADA, ETAPAS_RECOMPRA } from "@/app/(auth)/pipeline/mock-pipeline"
import { UFS } from "@/lib/uf"
import { PERFIS } from "@/lib/relatorios/rfv"
import { normalizarTexto } from "@/lib/catalogo/planilha"

export type Juncao = "e" | "ou"

export type TipoDeCampo = "texto" | "lista" | "data" | "numero" | "etiqueta" | "funil"

export type Assunto = "Cadastro" | "Etiquetas" | "Compras" | "Funil"

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
  | "maior"
  | "menor"
  | "tem"
  | "nao_tem"
  | "tem_qualquer"
  | "tem_todas"
  | "sem_etiqueta"
  | "com_etiqueta"
  | "na_etapa"
  | "fora_da_etapa"
  | "no_funil"
  | "fora_do_funil"

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
  /** Assunto em que o campo aparece na lista de campos. */
  assunto: Assunto
  tipo: TipoDeCampo
  /** Obrigatório no cadastro: sem "está vazio" nem "não está vazio" (CA-B37-36). */
  obrigatorio: boolean
  /** Opções fixas de um campo de lista. Sem elas, as opções vêm do servidor (atendente, etiqueta). */
  opcoes?: Opcao[]
}

/** Campo que é uma coluna de `contacts`. */
export interface CampoDoCadastro extends CampoDoFiltro {
  assunto: "Cadastro"
  /** Coluna de `contacts` que o campo lê. */
  coluna: string
}

const opcoesDe = (rotulos: Record<string, string>): Opcao[] =>
  Object.entries(rotulos).map(([valor, rotulo]) => ({ valor, rotulo }))

export const CAMPOS_DO_FILTRO: CampoDoCadastro[] = [
  { id: "nome", rotulo: "Nome", assunto: "Cadastro", tipo: "texto", coluna: "name", obrigatorio: false },
  { id: "telefone", rotulo: "Telefone", assunto: "Cadastro", tipo: "texto", coluna: "phone_number", obrigatorio: true },
  {
    id: "classificacao", rotulo: "Classificação", assunto: "Cadastro", tipo: "lista", coluna: "classificacao",
    obrigatorio: true, opcoes: opcoesDe(CLASSIFICACAO_LABEL),
  },
  { id: "tipo", rotulo: "Tipo", assunto: "Cadastro", tipo: "lista", coluna: "tipo", obrigatorio: false, opcoes: opcoesDe(TIPO_LABEL) },
  { id: "cidade", rotulo: "Cidade", assunto: "Cadastro", tipo: "texto", coluna: "cidade", obrigatorio: false },
  {
    id: "uf", rotulo: "UF", assunto: "Cadastro", tipo: "lista", coluna: "uf", obrigatorio: false,
    opcoes: UFS.map((u) => ({ valor: u.sigla, rotulo: `${u.sigla} — ${u.nome}` })),
  },
  {
    id: "icp", rotulo: "Perfil de cliente (ICP)", assunto: "Cadastro", tipo: "lista", coluna: "icp", obrigatorio: false,
    opcoes: opcoesDe(ICP_LABEL),
  },
  // B42-01: a carteira do vendedor é o atendente do contato (B35); o id fica, filtro salvo não muda.
  { id: "atendente", rotulo: "Atendente (carteira)", assunto: "Cadastro", tipo: "lista", coluna: "atendente_id", obrigatorio: false },
  { id: "observacoes", rotulo: "Observações", assunto: "Cadastro", tipo: "texto", coluna: "observacoes", obrigatorio: false },
  { id: "data_cadastro", rotulo: "Data de cadastro", assunto: "Cadastro", tipo: "data", coluna: "created_at", obrigatorio: true },
]

const opcoesDasEtapas = (etapas: ReadonlyArray<{ id: string; label: string }>): Opcao[] =>
  etapas.map((e) => ({ valor: e.id, rotulo: e.label }))

/** B37-02: campos calculados de outras tabelas (etiquetas, compras e cards do funil). */
export const CAMPOS_LIGADOS: CampoDoFiltro[] = [
  { id: "etiqueta", rotulo: "Etiqueta", assunto: "Etiquetas", tipo: "etiqueta", obrigatorio: false },
  { id: "total_comprado", rotulo: "Total já comprado", assunto: "Compras", tipo: "numero", obrigatorio: true },
  { id: "qtd_compras", rotulo: "Quantidade de compras", assunto: "Compras", tipo: "numero", obrigatorio: true },
  { id: "ultima_compra", rotulo: "Data da última compra", assunto: "Compras", tipo: "data", obrigatorio: false },
  // B42-01: perfil da aba RFV sem filtro de atendente; quem nunca comprou não tem perfil.
  {
    id: "perfil_rfv", rotulo: "Perfil RFV", assunto: "Compras", tipo: "lista", obrigatorio: false,
    opcoes: PERFIS.map((p) => ({ valor: p.id, rotulo: p.nome })),
  },
  {
    id: "etapa_entrada", rotulo: "Etapa no funil de Entrada", assunto: "Funil", tipo: "funil", obrigatorio: true,
    opcoes: opcoesDasEtapas(ETAPAS_ENTRADA),
  },
  {
    id: "etapa_recompra", rotulo: "Etapa no funil de Recompra", assunto: "Funil", tipo: "funil", obrigatorio: true,
    opcoes: opcoesDasEtapas(ETAPAS_RECOMPRA),
  },
]

/** Todos os campos que a tela oferece, na ordem dos assuntos. */
export const TODOS_OS_CAMPOS: CampoDoFiltro[] = [...CAMPOS_DO_FILTRO, ...CAMPOS_LIGADOS]

// B41-06: um campo por funil da empresa, com o id do funil no id do campo.

/** Funil da empresa para o filtro: o nome e as etapas, na ordem. */
export type FunilParaFiltro = { id: string; nome: string; etapas: Opcao[] }

const PREFIXO_FUNIL = "funil:"
const CAMPO_DE_FUNIL = /^funil:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const ehCampoDeFunil = (id: string) => CAMPO_DE_FUNIL.test(id)
export const campoDoFunil = (funilId: string) => `${PREFIXO_FUNIL}${funilId}`

/** "Etapa no funil <nome>", com as etapas do funil como opções. */
export function camposDosFunis(funis: FunilParaFiltro[] = []): CampoDoFiltro[] {
  return funis.map((f) => ({
    id: campoDoFunil(f.id),
    rotulo: `Etapa no funil ${f.nome}`,
    assunto: "Funil",
    tipo: "funil",
    obrigatorio: true,
    opcoes: f.etapas,
  }))
}

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
  maior: "maior que",
  menor: "menor que",
  tem: "tem",
  nao_tem: "não tem",
  tem_qualquer: "tem qualquer uma de",
  tem_todas: "tem todas de",
  sem_etiqueta: "sem etiqueta",
  com_etiqueta: "com alguma etiqueta",
  na_etapa: "está na etapa",
  fora_da_etapa: "não está na etapa",
  no_funil: "está no funil (qualquer etapa)",
  fora_do_funil: "não está no funil",
}

const COMPARACOES_DO_TIPO: Record<TipoDeCampo, Comparacao[]> = {
  texto: ["contem", "nao_contem", "igual", "vazio", "nao_vazio"],
  lista: ["e", "nao_e", "qualquer_de", "vazio", "nao_vazio"],
  data: ["antes", "depois", "entre", "ultimos_dias", "ha_mais_de_dias", "vazio", "nao_vazio"],
  numero: ["maior", "menor", "entre", "igual"],
  etiqueta: ["tem", "nao_tem", "tem_qualquer", "tem_todas", "sem_etiqueta", "com_etiqueta"],
  funil: ["na_etapa", "fora_da_etapa", "no_funil", "fora_do_funil"],
}

/**
 * O campo pelo id. Campo de funil da empresa vem dos `funis`; sem eles, ou com o funil
 * apagado, é um campo genérico, sem opções fixas: quem confere se o funil e a etapa
 * existem é `valorSumiu`, com os valores da empresa.
 */
export function campoDoFiltro(id: string, funis?: FunilParaFiltro[]): CampoDoFiltro | undefined {
  const fixo = TODOS_OS_CAMPOS.find((c) => c.id === id)
  if (fixo || !ehCampoDeFunil(id)) return fixo
  const doFunil = camposDosFunis(funis).find((c) => c.id === id)
  return doFunil ?? { id, rotulo: "Etapa num funil apagado", assunto: "Funil", tipo: "funil", obrigatorio: true }
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
  if (campo.tipo === "numero" && comparacao === "igual") return "igual a"
  return ROTULO_DA_COMPARACAO[comparacao]
}

/** Quantos valores a comparação pede. */
export function valoresPedidos(comparacao: Comparacao): "nenhum" | "um" | "dois" | "varios" {
  if (["vazio", "nao_vazio", "sem_etiqueta", "com_etiqueta", "no_funil", "fora_do_funil"].includes(comparacao)) return "nenhum"
  if (comparacao === "entre") return "dois"
  if (comparacao === "qualquer_de" || comparacao === "tem_qualquer" || comparacao === "tem_todas") return "varios"
  return "um"
}

const DATA = /^\d{4}-\d{2}-\d{2}$/
const DIAS = /^\d{1,5}$/
/** Reais com até dois centavos, com ponto (o campo numérico do navegador usa ponto). */
const NUMERO = /^\d{1,12}(\.\d{1,2})?$/

function valorValido(campo: CampoDoFiltro, comparacao: Comparacao, valor: string): boolean {
  if (!valor.trim()) return false
  if (campo.id === "telefone") return valor.replace(/\D/g, "").length > 0
  if (comparacao === "ultimos_dias" || comparacao === "ha_mais_de_dias") return DIAS.test(valor) && Number(valor) > 0
  if (campo.tipo === "data") return DATA.test(valor) && !Number.isNaN(Date.parse(valor))
  if (campo.tipo === "numero") return NUMERO.test(valor)
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

/** B37-03: campo interno que nunca vale; o banco o traduz para `false`. */
export const CAMPO_NUNCA = "nunca"

/** Valores dos campos de lista que vêm da empresa (atendente por id, etiqueta e, na B41-06, os funis). */
export type ValoresDaEmpresa = { atendentes: string[]; etiquetas: string[]; funis?: FunilParaFiltro[] }

/**
 * B37-03: a condição usa um valor que não existe mais (etiqueta apagada, atendente
 * removido, etapa fora da lista). Sem os valores da empresa, só confere as opções fixas.
 */
export function valorSumiu(condicao: Condicao, daEmpresa?: ValoresDaEmpresa): boolean {
  // B41-06: funil da empresa apagado, ou etapa que não é mais dele
  if (ehCampoDeFunil(condicao.campo) && daEmpresa?.funis) {
    const funil = daEmpresa.funis.find((f) => campoDoFunil(f.id) === condicao.campo)
    if (!funil) return true
    if (!condicao.comparacao || valoresPedidos(condicao.comparacao) === "nenhum") return false
    return condicao.valores.filter((v) => v.trim()).some((v) => !funil.etapas.some((e) => e.valor === v))
  }
  const campo = campoDoFiltro(condicao.campo)
  if (!campo || !condicao.comparacao || valoresPedidos(condicao.comparacao) === "nenhum") return false
  const valores = condicao.valores.filter((v) => v.trim())
  if (valores.length === 0) return false
  const existentes = campo.opcoes
    ? campo.opcoes.map((o) => o.valor)
    : daEmpresa && campo.id === "atendente"
      ? daEmpresa.atendentes
      : daEmpresa && campo.id === "etiqueta"
        ? daEmpresa.etiquetas
        : null
  return existentes !== null && valores.some((v) => !existentes.includes(v))
}

/**
 * Deixa só o que filtra: tira condições incompletas e grupos que ficaram vazios
 * (CA-B37-13). Condição com valor que sumiu vira uma que nunca vale (SUP-B37-05):
 * ignorá-la mostraria mais contatos do que o filtro pede.
 */
export function limparFiltro(filtro: Filtro, daEmpresa?: ValoresDaEmpresa): Filtro {
  return {
    juncao: filtro.juncao,
    grupos: filtro.grupos
      .map((g) => ({
        juncao: g.juncao,
        condicoes: g.condicoes.flatMap((c): Condicao[] => {
          if (c.campo === CAMPO_NUNCA || valorSumiu(c, daEmpresa)) return [{ campo: CAMPO_NUNCA, comparacao: "", valores: [] }]
          return condicaoCompleta(c) ? [paraOBanco(c)] : []
        }),
      }))
      .filter((g) => g.condicoes.length > 0),
  }
}

/** B37-03: nome do filtro salvo sem maiúscula, acento e espaços repetidos (nome único). */
export function chaveDoNome(nome: string): string {
  return normalizarTexto(nome)
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

/** Nomes da empresa que o resumo usa no lugar dos ids (atendente, funil e etapa). */
export type NomesDoFiltro = { atendentes?: Array<{ id: string; nome: string }>; funis?: FunilParaFiltro[] }

function descreverCondicao(condicao: Condicao, nomes: NomesDoFiltro): string {
  const campo = campoDoFiltro(condicao.campo, nomes.funis)!
  const comparacao = condicao.comparacao as Comparacao
  const nomeDoValor = (v: string) =>
    campo.opcoes?.find((o) => o.valor === v)?.rotulo ??
    (campo.id === "atendente" ? nomes.atendentes?.find((a) => a.id === v)?.nome : undefined) ??
    v
  const valores = condicao.valores.map(nomeDoValor)
  const rotulo = rotuloDaComparacao(campo, comparacao)
  if (comparacao === "ultimos_dias" || comparacao === "ha_mais_de_dias") return `${campo.rotulo} ${rotulo.replace("N", valores[0])}`
  switch (valoresPedidos(comparacao)) {
    case "nenhum":
      return `${campo.rotulo} ${rotulo}`
    case "dois":
      return `${campo.rotulo} ${rotulo} ${valores[0]} e ${valores[1]}`
    default:
      return `${campo.rotulo} ${rotulo} ${valores.join(", ")}`
  }
}

/**
 * B42-02: o filtro numa frase, com os nomes que a pessoa escolheu e os E/OU no lugar
 * certo (ex.: "(Cidade é igual a Fortaleza OU Cidade é igual a Recife) E Tipo é Lojista").
 * Só entram as condições completas, as mesmas que filtram.
 */
export function descreverFiltro(filtro: Filtro, nomes: NomesDoFiltro = {}): string {
  const junta = (juncao: Juncao) => (juncao === "ou" ? " OU " : " E ")
  const grupos = filtro.grupos
    .map((g) => ({ juncao: g.juncao, partes: g.condicoes.filter(condicaoCompleta).map((c) => descreverCondicao(c, nomes)) }))
    .filter((g) => g.partes.length > 0)
  return grupos
    .map((g) => (g.partes.length > 1 && grupos.length > 1 ? `(${g.partes.join(junta(g.juncao))})` : g.partes.join(junta(g.juncao))))
    .join(junta(filtro.juncao))
}

const esquemaCondicao = z.object({
  // B41-06: "funil:<uuid>" tem 42 caracteres
  campo: z.string().max(60),
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
        if (condicao.campo === CAMPO_NUNCA) continue
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

/** Botões fixos da lista (classificação, tipo, atendente): valem junto com o filtro. */
export const esquemaRapidos = z
  .array(
    z.object({
      campo: z.enum(["classificacao", "tipo", "atendente"]),
      comparacao: z.literal("e"),
      valores: z.array(z.string().min(1).max(200)).length(1),
    })
  )
  .max(4)
