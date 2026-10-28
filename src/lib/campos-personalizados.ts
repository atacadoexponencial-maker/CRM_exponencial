// B38-01: campos personalizados do contato, criados pela empresa.
// O valor fica em `contato_campos`, numa coluna por família de tipo; lista e múltipla
// escolha guardam o id da opção. Aqui ficam as regras de cada tipo: o que a entrada
// aceita, como o valor é guardado e como aparece na tela. O servidor confere com estas
// mesmas funções antes de gravar.

import { chaveDoNome, NOME_MAXIMO } from "@/lib/funis"
import { TODOS_OS_CAMPOS } from "@/lib/filtro-contatos"

export { NOME_MAXIMO }

/** SUP-B38-06 (confirmada em 26/10/2026). O banco segura os mesmos limites. */
export const LIMITE_DE_CAMPOS = 50
export const LIMITE_DE_OPCOES = 50

export type TipoDeCampo =
  | "texto"
  | "texto_longo"
  | "numero"
  | "dinheiro"
  | "data"
  | "lista"
  | "multipla"
  | "sim_nao"
  | "link"
  | "email"
  | "telefone"

/** Os onze tipos, na ordem da spec (PER-B38-01). */
export const TIPOS_DE_CAMPO: Array<{ id: TipoDeCampo; rotulo: string }> = [
  { id: "texto", rotulo: "Texto" },
  { id: "texto_longo", rotulo: "Texto longo" },
  { id: "numero", rotulo: "Número" },
  { id: "dinheiro", rotulo: "Dinheiro" },
  { id: "data", rotulo: "Data" },
  // B48-18: nomes que dizem quantas se escolhe
  { id: "lista", rotulo: "Uma opção" },
  { id: "multipla", rotulo: "Várias opções" },
  { id: "sim_nao", rotulo: "Sim/não" },
  { id: "link", rotulo: "Link" },
  { id: "email", rotulo: "E-mail" },
  { id: "telefone", rotulo: "Telefone" },
]

export function ehTipoDeCampo(tipo: string): tipo is TipoDeCampo {
  return TIPOS_DE_CAMPO.some((t) => t.id === tipo)
}

export function rotuloDoTipo(tipo: string): string {
  return TIPOS_DE_CAMPO.find((t) => t.id === tipo)?.rotulo ?? tipo
}

export function temOpcoes(tipo: string): boolean {
  return tipo === "lista" || tipo === "multipla"
}

export type OpcaoDoCampo = { id: string; nome: string }

export type CampoPersonalizado = {
  id: string
  nome: string
  tipo: TipoDeCampo
  /** Só em lista e múltipla escolha, na ordem da empresa. */
  opcoes: OpcaoDoCampo[]
}

/** B38-02: o campo da empresa. B38-09: todo campo vira coluna da lista de Contatos. */
export type CampoDaEmpresa = CampoPersonalizado

/** O valor como o banco guarda: uma coluna preenchida, conforme o tipo. */
export type ValorGuardado = {
  texto: string | null
  numero: number | null
  data: string | null
  booleano: boolean | null
  opcoes: string[] | null
}

/** O que a tela manda: texto digitado, ids marcados ou sim/não. Vazio é null ou "". */
export type EntradaDoCampo = string | string[] | boolean | null

const VAZIO: ValorGuardado = { texto: null, numero: null, data: null, booleano: null, opcoes: null }

const TEXTO_MAXIMO = 255
const TEXTO_LONGO_MAXIMO = 5000

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")

/** Nomes dos dados que o sistema já tem: não podem virar campo (CA-B38-07). */
const NOMES_DO_SISTEMA = new Set(
  [...TODOS_OS_CAMPOS.map((c) => c.rotulo), "Atendente", "ICP", "Perfil de cliente"].map((n) => semAcento(chaveDoNome(n)))
)

export function ehNomeDoSistema(nome: string): boolean {
  return NOMES_DO_SISTEMA.has(semAcento(chaveDoNome(nome)))
}

/** Mesmo nome, sem diferença de maiúscula nem espaço sobrando (CA-B38-06). */
export function mesmoNome(a: string, b: string): boolean {
  return chaveDoNome(a) === chaveDoNome(b)
}

// ---------------------------------------------------------------------------
// Conferir a entrada
// ---------------------------------------------------------------------------

export type Conferencia = { valor: ValorGuardado | null } | { erro: string }

const ERRO: Record<TipoDeCampo, string> = {
  texto: `Texto longo demais (até ${TEXTO_MAXIMO} letras).`,
  texto_longo: `Texto longo demais (até ${TEXTO_LONGO_MAXIMO} letras).`,
  numero: "Digite um número.",
  dinheiro: "Digite um valor em reais, com até 2 casas depois da vírgula.",
  data: "Data inválida.",
  lista: "Opção inválida.",
  multipla: "Opção inválida.",
  sim_nao: "Escolha sim ou não.",
  link: "Link inválido.",
  email: "E-mail inválido.",
  telefone: "Telefone inválido: use DDD e número, ou + e o código do país.",
}

/** "1.500,50", "1500,5", "R$ 1.500", "12.34" → número; o resto → null. */
export function lerNumero(texto: string): { numero: number; casas: number } | null {
  const s = texto.trim().replace(/^R\$/i, "").replace(/\s/g, "")
  if (!/^-?[\d.,]+$/.test(s)) return null
  let inteiro: string
  let decimais = ""
  if (s.includes(",")) {
    const partes = s.split(",")
    if (partes.length !== 2 || !/^\d+$/.test(partes[1])) return null
    if (!/^-?(\d{1,3}(\.\d{3})+|\d+)$/.test(partes[0])) return null
    inteiro = partes[0].replace(/\./g, "")
    decimais = partes[1]
  } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
    inteiro = s.replace(/\./g, "")
  } else if (/^-?\d+(\.\d+)?$/.test(s)) {
    ;[inteiro, decimais = ""] = s.split(".")
  } else {
    return null
  }
  const numero = Number(decimais ? `${inteiro}.${decimais}` : inteiro)
  if (!Number.isFinite(numero) || Math.abs(numero) >= 1e12) return null
  return { numero, casas: decimais.length }
}

/** "2026-04-03" ou "03/04/2026" → "2026-04-03", se o dia existe. */
export function lerData(texto: string): string | null {
  const s = texto.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  const [ano, mes, dia] = iso ? [iso[1], iso[2], iso[3]] : br ? [br[3], br[2], br[1]] : []
  if (!ano) return null
  const d = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)))
  if (d.getUTCFullYear() !== Number(ano) || d.getUTCMonth() !== Number(mes) - 1 || d.getUTCDate() !== Number(dia)) return null
  return `${ano}-${mes}-${dia}`
}

/** SUP-B38-08: sem "https://", o sistema completa. */
export function lerLink(texto: string): string | null {
  const s = texto.trim()
  if (!s || /\s/.test(s) || s.length > 500) return null
  const completo = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try {
    const url = new URL(completo)
    if (!url.hostname.includes(".") || url.hostname.startsWith(".") || url.hostname.endsWith(".")) return null
    return completo
  } catch {
    return null
  }
}

export function lerEmail(texto: string): string | null {
  const s = texto.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) && s.length <= 254 ? s : null
}

/** SUP-B38-07: DDD e número (10 ou 11 dígitos), ou "+" e 8 a 15 dígitos. Guarda só os dígitos. */
export function lerTelefone(texto: string): string | null {
  const s = texto.trim()
  if (!/^\+?[\d\s().-]+$/.test(s)) return null
  const digitos = s.replace(/\D/g, "")
  if (s.startsWith("+")) return digitos.length >= 8 && digitos.length <= 15 ? `+${digitos}` : null
  return digitos.length === 10 || digitos.length === 11 ? digitos : null
}

function ehVazio(entrada: EntradaDoCampo): boolean {
  if (entrada === null || entrada === undefined) return true
  if (typeof entrada === "string") return entrada.trim() === ""
  if (Array.isArray(entrada)) return entrada.length === 0
  return false
}

/** Confere a entrada pelo tipo. Vazio vira `valor: null` (o contato fica sem o campo). */
export function conferirValor(campo: Pick<CampoPersonalizado, "tipo" | "opcoes">, entrada: EntradaDoCampo): Conferencia {
  if (ehVazio(entrada)) return { valor: null }
  const { tipo } = campo
  const erro = { erro: ERRO[tipo] }

  if (tipo === "sim_nao") {
    if (typeof entrada === "boolean") return { valor: { ...VAZIO, booleano: entrada } }
    if (entrada === "sim" || entrada === "nao") return { valor: { ...VAZIO, booleano: entrada === "sim" } }
    return erro
  }
  if (tipo === "lista" || tipo === "multipla") {
    const ids = typeof entrada === "string" ? [entrada] : Array.isArray(entrada) ? entrada : null
    if (!ids || (tipo === "lista" && ids.length !== 1)) return erro
    const validas = campo.opcoes.map((o) => o.id)
    if (ids.some((id) => !validas.includes(id))) return erro
    // Guarda na ordem das opções, sem repetir.
    return { valor: { ...VAZIO, opcoes: validas.filter((id) => ids.includes(id)) } }
  }
  if (typeof entrada !== "string") return erro

  const texto = entrada.trim()
  switch (tipo) {
    case "texto":
      return texto.length <= TEXTO_MAXIMO ? { valor: { ...VAZIO, texto } } : erro
    case "texto_longo":
      return texto.length <= TEXTO_LONGO_MAXIMO ? { valor: { ...VAZIO, texto } } : erro
    case "numero": {
      const lido = lerNumero(texto)
      return lido ? { valor: { ...VAZIO, numero: lido.numero } } : erro
    }
    case "dinheiro": {
      const lido = lerNumero(texto)
      return lido && lido.casas <= 2 ? { valor: { ...VAZIO, numero: lido.numero } } : erro
    }
    case "data": {
      const data = lerData(texto)
      return data ? { valor: { ...VAZIO, data } } : erro
    }
    case "link": {
      const link = lerLink(texto)
      return link ? { valor: { ...VAZIO, texto: link } } : erro
    }
    case "email": {
      const email = lerEmail(texto)
      return email ? { valor: { ...VAZIO, texto: email } } : erro
    }
    case "telefone": {
      const telefone = lerTelefone(texto)
      return telefone ? { valor: { ...VAZIO, texto: telefone } } : erro
    }
  }
}

// ---------------------------------------------------------------------------
// Mostrar o valor
// ---------------------------------------------------------------------------

export const SEM_VALOR = "—"

const numeroBr = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 6 })

export function formatarDinheiro(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function formatarTelefoneDoCampo(guardado: string): string {
  if (guardado.startsWith("+")) return guardado
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(guardado)
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : guardado
}

/** O valor como texto para a tela (CA-B38-22). Sem valor, "—". */
export function formatarValor(campo: Pick<CampoPersonalizado, "tipo" | "opcoes">, valor: ValorGuardado | null): string {
  if (!valor) return SEM_VALOR
  switch (campo.tipo) {
    case "numero":
      return valor.numero === null ? SEM_VALOR : numeroBr(valor.numero)
    case "dinheiro":
      return valor.numero === null ? SEM_VALOR : formatarDinheiro(valor.numero)
    case "data": {
      if (!valor.data) return SEM_VALOR
      const [ano, mes, dia] = valor.data.split("-")
      return `${dia}/${mes}/${ano}`
    }
    case "sim_nao":
      return valor.booleano === null ? SEM_VALOR : valor.booleano ? "Sim" : "Não"
    case "lista":
    case "multipla": {
      const nomes = campo.opcoes.filter((o) => valor.opcoes?.includes(o.id)).map((o) => o.nome)
      return nomes.length > 0 ? nomes.join(", ") : SEM_VALOR
    }
    case "telefone":
      return valor.texto ? formatarTelefoneDoCampo(valor.texto) : SEM_VALOR
    default:
      return valor.texto || SEM_VALOR
  }
}

/** O valor guardado de volta como entrada, para abrir a edição. */
export function entradaDoValor(campo: Pick<CampoPersonalizado, "tipo">, valor: ValorGuardado | null): EntradaDoCampo {
  switch (campo.tipo) {
    case "numero":
      return valor?.numero == null ? "" : String(valor.numero).replace(".", ",")
    case "dinheiro":
      return valor?.numero == null ? "" : valor.numero.toFixed(2).replace(".", ",")
    case "data":
      return valor?.data ?? ""
    case "sim_nao":
      return valor?.booleano ?? null
    case "lista":
      return valor?.opcoes?.[0] ?? ""
    case "multipla":
      return valor?.opcoes ?? []
    case "telefone":
      return valor?.texto ? formatarTelefoneDoCampo(valor.texto) : ""
    default:
      return valor?.texto ?? ""
  }
}

/** Linha de `contato_campos` → valor guardado. */
export function valorDaLinha(linha: {
  valor_texto: string | null
  valor_numero: number | null
  valor_data: string | null
  valor_booleano: boolean | null
  valor_opcoes: string[] | null
}): ValorGuardado {
  return {
    texto: linha.valor_texto,
    numero: linha.valor_numero === null ? null : Number(linha.valor_numero),
    data: linha.valor_data,
    booleano: linha.valor_booleano,
    opcoes: linha.valor_opcoes,
  }
}

// ---------------------------------------------------------------------------
// B38-04: automações
// ---------------------------------------------------------------------------

/**
 * O valor num formato único, para o gatilho comparar e a ação gravar: número com
 * ponto, data aaaa-mm-dd, ids das opções separados por vírgula, "sim"/"nao", ou o
 * texto. Sem valor, "".
 */
export function canonicoDoValor(tipo: TipoDeCampo, valor: ValorGuardado | null): string {
  if (!valor) return ""
  switch (tipo) {
    case "numero":
    case "dinheiro":
      return valor.numero === null ? "" : String(valor.numero)
    case "data":
      return valor.data ?? ""
    case "sim_nao":
      return valor.booleano === null ? "" : valor.booleano ? "sim" : "nao"
    case "lista":
    case "multipla":
      return (valor.opcoes ?? []).join(",")
    default:
      return valor.texto ?? ""
  }
}

/** O formato único de volta como entrada da tela (`conferirValor` aceita número com ponto). */
export function entradaDoCanonico(tipo: TipoDeCampo, canonico: string): EntradaDoCampo {
  if (tipo === "multipla") return canonico.split(",").map((v) => v.trim()).filter(Boolean)
  return canonico
}

/** O formato único lido como valor, para mostrar nas frases do editor e do histórico. */
export function valorDoCanonico(campo: Pick<CampoPersonalizado, "tipo" | "opcoes">, canonico: string): ValorGuardado | null {
  const conferido = conferirValor(campo, entradaDoCanonico(campo.tipo, canonico))
  return "erro" in conferido ? null : conferido.valor
}

/** "Hoje" no fuso da operação, como aaaa-mm-dd. */
function hojeEmBrasilia(agora: Date): string {
  return agora.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })
}

function diasAntes(dia: string, n: number): string {
  const d = new Date(`${dia}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const textoComparavel = (tipo: TipoDeCampo, texto: string) =>
  tipo === "telefone"
    ? texto.replace(/\D/g, "")
    : texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()

/**
 * A condição "campo personalizado" das automações (CA-B38-38): as mesmas comparações
 * do filtro de Contatos, com a mesma regra. As negativas ("não é", "não contém",
 * "não é nenhum de") não valem para quem está com o campo vazio.
 */
export function campoAtende(
  tipo: TipoDeCampo,
  valor: ValorGuardado | null,
  comparacao: string,
  valores: string[],
  agora = new Date()
): boolean {
  const [v1 = "", v2 = ""] = valores
  if (tipo === "lista" || tipo === "multipla") {
    const tem = valor?.opcoes ?? []
    switch (comparacao) {
      case "qualquer_de":
      case "tem_qualquer":
        return valores.some((v) => tem.includes(v))
      case "tem_todas":
        return valores.length > 0 && valores.every((v) => tem.includes(v))
      case "nenhum_de":
        return tem.length > 0 && !valores.some((v) => tem.includes(v))
      case "vazio":
        return tem.length === 0
      case "nao_vazio":
        return tem.length > 0
      default:
        return false
    }
  }
  if (tipo === "sim_nao") {
    const b = valor?.booleano ?? null
    if (comparacao === "e") return b !== null && b === (v1 === "sim")
    if (comparacao === "vazio") return b === null
    return false
  }
  if (tipo === "numero" || tipo === "dinheiro") {
    const n = valor?.numero ?? null
    if (comparacao === "vazio") return n === null
    if (comparacao === "nao_vazio") return n !== null
    if (n === null) return false
    switch (comparacao) {
      case "igual":
        return n === Number(v1)
      case "maior":
        return n > Number(v1)
      case "menor":
        return n < Number(v1)
      case "entre":
        return n >= Number(v1) && n <= Number(v2)
      default:
        return false
    }
  }
  if (tipo === "data") {
    const d = valor?.data ?? null
    if (comparacao === "vazio") return d === null
    if (comparacao === "nao_vazio") return d !== null
    if (d === null) return false
    const hoje = hojeEmBrasilia(agora)
    switch (comparacao) {
      case "antes":
        return d < v1
      case "depois":
        return d > v1
      case "entre":
        return d >= v1 && d <= v2
      case "ultimos_dias":
        return d >= diasAntes(hoje, Number(v1))
      case "ha_mais_de_dias":
        return d < diasAntes(hoje, Number(v1))
      default:
        return false
    }
  }
  // Texto, texto longo, link, e-mail e telefone
  const texto = valor?.texto?.trim() ? textoComparavel(tipo, valor.texto) : ""
  const procurado = textoComparavel(tipo, v1)
  switch (comparacao) {
    case "vazio":
      return texto === ""
    case "nao_vazio":
      return texto !== ""
    case "contem":
      return texto !== "" && texto.includes(procurado)
    case "nao_contem":
      return texto !== "" && !texto.includes(procurado)
    case "igual":
      return texto !== "" && texto === procurado
    case "nao_e":
      return texto !== "" && texto !== procurado
    default:
      return false
  }
}
