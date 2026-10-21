// Importação de produtos por planilha (B18). Funções puras: leem a matriz de células já
// extraída do arquivo, conferem cada linha e agrupam as linhas do mesmo produto pelo código.

import { chaveCombinacao, MAX_TIPOS_VARIACAO } from "./combinacoes"
import { ESTOQUE_MAXIMO, MAX_FOTOS, MAX_OPCOES_POR_TIPO } from "./regras"
import { MAX_FAIXAS, validarFaixas, validarGrade, validarMinimo, type FaixaPreco, type GradeFechada } from "./regras-de-venda"

export const MAX_LINHAS_PLANILHA = 1000
export const TAMANHO_MAX_PLANILHA = 4 * 1024 * 1024
/** Extensão do arquivo → aceito. */
export const EXTENSOES_PLANILHA = ["xlsx", "xls", "csv"]

export type ChaveColuna =
  | "codigo" | "nome" | "preco" | "precoDe" | "categoria" | "descricao"
  | "variacao1" | "opcao1" | "variacao2" | "opcao2" | "estoque" | "visivel" | "fotos"
  | "faixas" | "minimo" | "grade" | "precoGrade"

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
  // B31-04: regras de venda, todas opcionais. Vazio num produto que já existe mantém a regra.
  { chave: "faixas", titulo: "Preço por quantidade", obrigatoria: false, oQueVai: `Faixas "quantidade=preço" separadas por ponto e vírgula, até ${MAX_FAIXAS}, com preços abaixo do preço da peça. Basta na primeira linha do produto.`, exemplo: "12=79,90;48=69,90" },
  { chave: "minimo", titulo: "Mínimo de peças", obrigatoria: false, oQueVai: "Mínimo de peças do produto por pedido (somando cores e tamanhos), além do mínimo da loja.", exemplo: "6" },
  { chave: "grade", titulo: "Grade fechada", obrigatoria: false, oQueVai: "Quantidade por opção da Variação 1 (ex.: P1 M2 G2 GG1): o produto só sai em grades inteiras. Só com variação.", exemplo: "P1 M2 G1" },
  { chave: "precoGrade", titulo: "Preço da grade", obrigatoria: false, oQueVai: "Preço próprio da grade fechada; vazio, a grade custa a soma das peças.", exemplo: "300,00" },
]

/** Linhas de exemplo do modelo: um produto sem variação e um com 3 tamanhos. */
export const LINHAS_EXEMPLO: Partial<Record<ChaveColuna, string>>[] = [
  { codigo: "CIN-001", nome: "Cinto Couro", preco: "39,90", categoria: "Acessórios", descricao: "Couro legítimo.", estoque: "20", visivel: "sim" },
  { codigo: "VES-001", nome: "Vestido Linho", preco: "89,90", precoDe: "119,90", categoria: "Vestidos", descricao: "Linho leve, forrado.", variacao1: "Tamanho", opcao1: "P", estoque: "5", visivel: "sim", faixas: "12=79,90;48=69,90", minimo: "6", grade: "P1 M2 G1" },
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
  /** B31-04: regras de venda; `null` = coluna vazia (novo: sem regra; atualização: mantém). */
  faixas: FaixaPreco[] | null
  minimo: number | null
  grade: GradeFechada | null
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

/** "12=24,90;48=21,90" → faixas brutas (a conferência de ordem e preço é de `validarFaixas`). `null` se o formato não bate. */
export function lerFaixas(valor: unknown): FaixaPreco[] | null {
  const partes = texto(valor).split(/[;\n]+/).map((p) => p.trim()).filter(Boolean)
  const faixas: FaixaPreco[] = []
  for (const parte of partes) {
    const m = /^(\d+)\s*=\s*(.+)$/.exec(parte)
    if (!m) return null
    const preco = lerPreco(m[2])
    if (preco === null) return null
    faixas.push({ min: Number(m[1]), preco })
  }
  return faixas
}

/** "P1 M2 G2 GG1", "P 1, M 2", "P=1;M=2" ou "38=2 40=2" → quantidade por opção. `null` se o formato não bate. */
export function lerGrade(valor: unknown): Record<string, number> | null {
  const tokens = texto(valor).split(/[,;\n\s]+/).filter(Boolean)
  const quantidades: Record<string, number> = {}
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    const comIgual = /^(.+?)=(\d+)$/.exec(t)
    const colado = /^([^\d=]+?)(\d+)$/.exec(t)
    if (comIgual) quantidades[comIgual[1].trim()] = Number(comIgual[2])
    else if (colado) quantidades[colado[1].trim()] = Number(colado[2])
    else if (!/[=\d]/.test(t) && /^\d+$/.test(tokens[i + 1] ?? "")) { quantidades[t] = Number(tokens[i + 1]); i++ }
    else return null
  }
  return Object.keys(quantidades).length > 0 ? quantidades : null
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

    // B31-04: regras de venda, conferidas como no editor.
    let faixas: FaixaPreco[] | null = null
    if (texto(v("faixas")) !== "") {
      const lidas = lerFaixas(v("faixas"))
      if (lidas === null) erro(primeira.numero, `em "Preço por quantidade", use quantidade=preço separados por ponto e vírgula (ex.: 12=24,90;48=21,90).`)
      else if (preco !== null) {
        const conferidas = validarFaixas(lidas, preco)
        if ("erro" in conferidas) erro(primeira.numero, `${codigo}: ${conferidas.erro}`)
        else faixas = conferidas.faixas
      }
    }
    let minimo: number | null = null
    if (texto(v("minimo")) !== "") {
      const lido = lerInteiro(v("minimo"))
      const conferido = validarMinimo(lido ?? Number.NaN)
      if ("erro" in conferido) erro(primeira.numero, `${codigo}: ${conferido.erro}`)
      else minimo = conferido.minimo
    }
    let grade: GradeFechada | null = null
    if (texto(v("grade")) !== "") {
      const lida = lerGrade(v("grade"))
      if (lida === null) erro(primeira.numero, `em "Grade fechada", use opção e quantidade (ex.: P1 M2 G2 GG1).`)
      else {
        const primeiroTipo = tipos[0]
        const desconhecida = primeiroTipo ? Object.keys(lida).find((o) => !primeiroTipo.opcoes.some((x) => normalizarTexto(x) === normalizarTexto(o))) : undefined
        let precoGrade: number | null = null
        if (texto(v("precoGrade")) !== "") {
          precoGrade = lerPreco(v("precoGrade"))
          if (precoGrade === null) erro(primeira.numero, `o preço da grade "${texto(v("precoGrade"))}" não é um número.`)
        }
        if (!primeiroTipo) erro(primeira.numero, `${codigo}: Grade fechada: o produto precisa ter variação (ex.: Tamanho).`)
        else if (desconhecida) erro(primeira.numero, `${codigo}: a opção "${desconhecida}" da grade fechada não existe em ${primeiroTipo.nome}.`)
        else {
          const grafia = (o: string) => primeiroTipo.opcoes.find((x) => normalizarTexto(x) === normalizarTexto(o)) ?? o
          const conferida = validarGrade({ quantidades: Object.fromEntries(Object.entries(lida).map(([o, q]) => [grafia(o), q])), preco: precoGrade ?? null }, tipos)
          if ("erro" in conferida) erro(primeira.numero, `${codigo}: ${conferida.erro}`)
          else grade = conferida.grade
        }
      }
    } else if (texto(v("precoGrade")) !== "") {
      erro(primeira.numero, `${codigo}: "Preço da grade" só vale com "Grade fechada" preenchida.`)
    }

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
      faixas,
      minimo,
      grade,
    })
  }

  return { produtos, erros, faltando: [], totalLinhas: linhas.length }
}
