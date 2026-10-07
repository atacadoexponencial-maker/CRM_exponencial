// Importação de produtos por planilha (B18). Funções puras: leem a matriz de células já
// extraída do arquivo, conferem cada linha e agrupam as linhas do mesmo produto pelo código.

import { chaveCombinacao, MAX_TIPOS_VARIACAO } from "./combinacoes"
import { ESTOQUE_MAXIMO, MAX_FOTOS, MAX_OPCOES_POR_TIPO } from "./regras"

export const MAX_LINHAS_PLANILHA = 1000
export const TAMANHO_MAX_PLANILHA = 4 * 1024 * 1024
/** Extensão do arquivo → aceito. */
export const EXTENSOES_PLANILHA = ["xlsx", "xls", "csv"]

export type ChaveColuna =
  | "codigo" | "nome" | "preco" | "precoDe" | "categoria" | "descricao"
  | "variacao1" | "opcao1" | "variacao2" | "opcao2" | "estoque" | "visivel" | "fotos"

export const COLUNAS_PLANILHA: { chave: ChaveColuna; titulo: string; obrigatoria: boolean; oQueVai: string; exemplo: string }[] = [
  { chave: "codigo", titulo: "Código", obrigatoria: true, oQueVai: "Identifica o produto. Linhas com o mesmo código são o mesmo produto; reimportar com o mesmo código atualiza o produto.", exemplo: "VES-001" },
  { chave: "nome", titulo: "Nome", obrigatoria: true, oQueVai: "Nome do produto, até 120 caracteres. Basta na primeira linha do produto.", exemplo: "Vestido Linho" },
  { chave: "preco", titulo: "Preço", obrigatoria: true, oQueVai: "Preço da peça, maior que zero. Basta na primeira linha do produto.", exemplo: "89,90" },
  { chave: "precoDe", titulo: "Preço de", obrigatoria: false, oQueVai: "Preço riscado (\"de\"), maior que o preço.", exemplo: "119,90" },
  { chave: "categoria", titulo: "Categoria", obrigatoria: false, oQueVai: "Nome da categoria. Se não existir no catálogo, é criada.", exemplo: "Vestidos" },
  { chave: "descricao", titulo: "Descrição", obrigatoria: false, oQueVai: "Texto livre sobre o produto.", exemplo: "Linho leve, forrado." },
  { chave: "variacao1", titulo: "Variação 1", obrigatoria: false, oQueVai: "Nome do primeiro tipo de variação. Igual em todas as linhas do produto.", exemplo: "Tamanho" },
  { chave: "opcao1", titulo: "Opção 1", obrigatoria: false, oQueVai: "A opção desta linha.", exemplo: "P" },
  { chave: "variacao2", titulo: "Variação 2", obrigatoria: false, oQueVai: "Nome do segundo tipo de variação, se houver.", exemplo: "Cor" },
  { chave: "opcao2", titulo: "Opção 2", obrigatoria: false, oQueVai: "A opção desta linha.", exemplo: "Areia" },
  { chave: "estoque", titulo: "Estoque", obrigatoria: false, oQueVai: "Peças desta combinação (ou do produto, se não tem variação). Vazio vale 0 num produto novo.", exemplo: "5" },
  { chave: "visivel", titulo: "Visível na loja", obrigatoria: false, oQueVai: "\"sim\" ou \"não\". Vazio vale sim num produto novo.", exemplo: "sim" },
  { chave: "fotos", titulo: "Fotos", obrigatoria: false, oQueVai: `Links das fotos separados por espaço, vírgula ou ponto e vírgula; a primeira é a principal. Até ${MAX_FOTOS}.`, exemplo: "https://exemplo.com/vestido-1.jpg" },
]

/** Linhas de exemplo do modelo: um produto sem variação e um com 3 tamanhos. */
export const LINHAS_EXEMPLO: Partial<Record<ChaveColuna, string>>[] = [
  { codigo: "CIN-001", nome: "Cinto Couro", preco: "39,90", categoria: "Acessórios", descricao: "Couro legítimo.", estoque: "20", visivel: "sim" },
  { codigo: "VES-001", nome: "Vestido Linho", preco: "89,90", precoDe: "119,90", categoria: "Vestidos", descricao: "Linho leve, forrado.", variacao1: "Tamanho", opcao1: "P", estoque: "5", visivel: "sim" },
  { codigo: "VES-001", variacao1: "Tamanho", opcao1: "M", estoque: "8" },
  { codigo: "VES-001", variacao1: "Tamanho", opcao1: "G", estoque: "3" },
]

export interface ProdutoPlanilha {
  codigo: string
  /** Números das linhas na planilha (o cabeçalho é a linha 1). */
  linhas: number[]
  nome: string
  preco: number
  precoDe: number | null
  categoria: string | null
  descricao: string | null
  /** `null` = vazio na planilha (novo: sim; atualização: mantém). */
  visivel: boolean | null
  /** `null` = coluna vazia (atualização mantém as fotos). */
  fotos: string[] | null
  tipos: { nome: string; opcoes: string[] }[]
  /** Estoque por combinação; `null` = vazio (novo: 0; atualização: mantém). */
  estoque: Record<string, number | null>
}

export interface ErroPlanilha {
  linhas: number[]
  codigo: string | null
  texto: string
}

export interface PlanilhaInterpretada {
  produtos: ProdutoPlanilha[]
  erros: ErroPlanilha[]
  /** Títulos das colunas obrigatórias que não estão no cabeçalho. */
  faltando: string[]
  /** Linhas com algum conteúdo (fora o cabeçalho). */
  totalLinhas: number
}

/** Minúsculas, sem acento e sem espaço sobrando: para comparar cabeçalhos e nomes. */
export function normalizarTexto(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim()
}

function texto(valor: unknown): string {
  if (valor === null || valor === undefined) return ""
  return String(valor).trim()
}

/** "89,90", "89.90", "R$ 89,90", "1.234,56" ou o número da célula. `null` se não for número. */
export function lerPreco(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null
  let t = texto(valor).replace(/R\$/i, "").replace(/\s/g, "")
  if (!t) return null
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".")
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, "")
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null
  return Math.round(Number(t) * 100) / 100
}

/** Inteiro (ex.: estoque). `null` se não for número inteiro. */
export function lerInteiro(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isInteger(valor) ? valor : null
  const t = texto(valor).replace(/\s/g, "")
  if (!/^-?\d+$/.test(t)) return null
  return Number(t)
}

/** sim/não, s/n, true/false, 1/0. `undefined` quando o valor não é nenhum desses. */
export function lerSimNao(valor: unknown): boolean | undefined {
  if (typeof valor === "boolean") return valor
  const t = normalizarTexto(texto(valor))
  if (["sim", "s", "true", "1", "verdadeiro"].includes(t)) return true
  if (["nao", "n", "false", "0", "falso"].includes(t)) return false
  return undefined
}

function lerFotos(valor: unknown): string[] {
  return texto(valor).split(/[\s,;]+/).filter(Boolean)
}

/** Lê a matriz de células (primeira linha = cabeçalho) e agrupa os produtos pelo código. */
export function interpretarPlanilha(matriz: unknown[][]): PlanilhaInterpretada {
  const [cabecalho = [], ...corpo] = matriz
  const indice = new Map<ChaveColuna, number>()
  cabecalho.forEach((celula, i) => {
    const titulo = normalizarTexto(texto(celula))
    const coluna = COLUNAS_PLANILHA.find((c) => normalizarTexto(c.titulo) === titulo)
    if (coluna && !indice.has(coluna.chave)) indice.set(coluna.chave, i)
  })
  const faltando = COLUNAS_PLANILHA.filter((c) => c.obrigatoria && !indice.has(c.chave)).map((c) => c.titulo)

  const linhas = corpo
    .map((celulas, i) => ({ numero: i + 2, celulas }))
    .filter(({ celulas }) => celulas.some((c) => texto(c) !== ""))
  if (faltando.length > 0) return { produtos: [], erros: [], faltando, totalLinhas: linhas.length }

  const valor = (celulas: unknown[], chave: ChaveColuna) => {
    const i = indice.get(chave)
    return i === undefined ? null : celulas[i] ?? null
  }

  // Agrupa pelo código, na ordem em que aparecem.
  const grupos = new Map<string, { numero: number; celulas: unknown[] }[]>()
  const erros: ErroPlanilha[] = []
  for (const linha of linhas) {
    const codigo = texto(valor(linha.celulas, "codigo"))
    if (!codigo) {
      erros.push({ linhas: [linha.numero], codigo: null, texto: `Linha ${linha.numero}: falta o código do produto.` })
      continue
    }
    const grupo = grupos.get(codigo) ?? []
    grupo.push(linha)
    grupos.set(codigo, grupo)
  }

  const produtos: ProdutoPlanilha[] = []
  for (const [codigo, grupo] of grupos) {
    const numeros = grupo.map((l) => l.numero)
    const errosDoProduto: string[] = []
    const erro = (linha: number | number[], msg: string) => {
      const ls = Array.isArray(linha) ? linha : [linha]
      errosDoProduto.push(`${ls.length > 1 ? `Linhas ${ls.slice(0, -1).join(", ")} e ${ls.at(-1)}` : `Linha ${ls[0]}`}: ${msg}`)
    }
    const primeira = grupo[0]
    const v = (chave: ChaveColuna) => valor(primeira.celulas, chave)

    const nome = texto(v("nome"))
    if (!nome) erro(primeira.numero, `falta o nome do produto ${codigo}.`)
    else if (nome.length > 120) erro(primeira.numero, `o nome de ${codigo} passa de 120 caracteres.`)

    const precoBruto = v("preco")
    const preco = lerPreco(precoBruto)
    if (texto(precoBruto) === "") erro(primeira.numero, `falta o preço do produto ${codigo}.`)
    else if (preco === null) erro(primeira.numero, `o preço "${texto(precoBruto)}" não é um número.`)
    else if (preco <= 0) erro(primeira.numero, `o preço de ${codigo} precisa ser maior que zero.`)

    const precoDeBruto = v("precoDe")
    let precoDe: number | null = null
    if (texto(precoDeBruto) !== "") {
      precoDe = lerPreco(precoDeBruto)
      if (precoDe === null) erro(primeira.numero, `o preço de "${texto(precoDeBruto)}" não é um número.`)
      else if (preco !== null && precoDe <= preco) erro(primeira.numero, `o "Preço de" de ${codigo} precisa ser maior que o preço.`)
    }

    const categoria = texto(v("categoria"))
    if (categoria.length > 60) erro(primeira.numero, `o nome da categoria de ${codigo} passa de 60 caracteres.`)

    const visivelBruto = v("visivel")
    let visivel: boolean | null = null
    if (texto(visivelBruto) !== "") {
      const lido = lerSimNao(visivelBruto)
      if (lido === undefined) erro(primeira.numero, `em "Visível na loja", use sim ou não (veio "${texto(visivelBruto)}").`)
      else visivel = lido
    }

    let fotos: string[] | null = null
    if (texto(v("fotos")) !== "") {
      fotos = lerFotos(v("fotos"))
      if (fotos.length > MAX_FOTOS) erro(primeira.numero, `${codigo} tem ${fotos.length} fotos; o limite é ${MAX_FOTOS}.`)
      const ruim = fotos.find((f) => !/^https?:\/\//i.test(f))
      if (ruim) erro(primeira.numero, `o link de foto "${ruim.slice(0, 60)}" precisa começar com http:// ou https://.`)
    }

    // Variações: os nomes vêm da primeira linha e precisam ser iguais nas outras.
    const nomesTipos = [texto(v("variacao1")), texto(v("variacao2"))]
    if (!nomesTipos[0] && nomesTipos[1]) erro(primeira.numero, `${codigo} tem Variação 2 sem Variação 1.`)
    const tiposUsados = nomesTipos[0] ? (nomesTipos[1] ? 2 : 1) : 0
    const tipos = nomesTipos.slice(0, Math.min(tiposUsados, MAX_TIPOS_VARIACAO)).map((nome) => ({ nome, opcoes: [] as string[] }))
    const estoque: Record<string, number | null> = {}
    const vistas = new Map<string, number[]>()

    for (const linha of grupo) {
      const c = linha.celulas
      const nomes = [texto(valor(c, "variacao1")), texto(valor(c, "variacao2"))]
      const opcoes = [texto(valor(c, "opcao1")), texto(valor(c, "opcao2"))]
      for (let t = 0; t < 2; t++) {
        const numeroTipo = t + 1
        if (opcoes[t] && !nomes[t] && !nomesTipos[t]) erro(linha.numero, `Opção ${numeroTipo} sem Variação ${numeroTipo}.`)
        if (t < tiposUsados) {
          if (nomes[t] && normalizarTexto(nomes[t]) !== normalizarTexto(nomesTipos[t])) erro(linha.numero, `a Variação ${numeroTipo} de ${codigo} é "${nomesTipos[t]}" na linha ${primeira.numero} e "${nomes[t]}" aqui.`)
          if (!opcoes[t]) erro(linha.numero, `falta a Opção ${numeroTipo} (${nomesTipos[t]}) de ${codigo}.`)
        }
      }
      const opcoesDaLinha = opcoes.slice(0, tiposUsados)
      opcoesDaLinha.forEach((o, t) => {
        if (o && !tipos[t].opcoes.some((x) => normalizarTexto(x) === normalizarTexto(o))) tipos[t].opcoes.push(o)
      })
      // Combinação com a grafia da primeira vez que a opção apareceu.
      const chave = chaveCombinacao(opcoesDaLinha.map((o, t) => tipos[t].opcoes.find((x) => normalizarTexto(x) === normalizarTexto(o)) ?? o))
      vistas.set(chave, [...(vistas.get(chave) ?? []), linha.numero])

      const estoqueBruto = valor(c, "estoque")
      if (texto(estoqueBruto) === "") {
        if (!(chave in estoque)) estoque[chave] = null
      } else {
        const q = lerInteiro(estoqueBruto)
        if (q === null || q < 0 || q > ESTOQUE_MAXIMO) erro(linha.numero, `o estoque "${texto(estoqueBruto)}" precisa ser um número inteiro de 0 a ${ESTOQUE_MAXIMO.toLocaleString("pt-BR")}.`)
        else estoque[chave] = q
      }
    }

    for (const [chave, ls] of vistas) {
      if (ls.length < 2) continue
      erro(ls, tiposUsados === 0 ? `o produto ${codigo} não tem variação e aparece em mais de uma linha.` : `o produto ${codigo} tem a combinação ${chave} repetida.`)
    }
    tipos.forEach((t) => {
      if (t.opcoes.length > MAX_OPCOES_POR_TIPO) erro(numeros, `${codigo} tem ${t.opcoes.length} opções em ${t.nome}; o limite é ${MAX_OPCOES_POR_TIPO}.`)
    })

    if (errosDoProduto.length > 0) {
      erros.push(...errosDoProduto.map((t) => ({ linhas: numeros, codigo, texto: t })))
      continue
    }
    produtos.push({
      codigo,
      linhas: numeros,
      nome,
      preco: preco!,
      precoDe,
      categoria: categoria || null,
      descricao: texto(v("descricao")) || null,
      visivel,
      fotos,
      tipos,
      estoque,
    })
  }

  return { produtos, erros, faltando: [], totalLinhas: linhas.length }
}
