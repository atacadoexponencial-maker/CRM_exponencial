// B54-01: a leitura do `components` que a Graph API devolve para um template de
// mensagem (WhatsApp Message Template). Só tipo e conversão, sem React nem rede: a
// tela de templates e, nas próximas issues, a campanha usam a mesma estrutura.
//
// B54-02: o caminho de volta (`componentsParaMeta`), para criar e editar, e os status
// em que a Meta deixa editar.

export type TipoDeCabecalho = "texto" | "imagem" | "video" | "documento" | "localizacao"

export type BotaoDoTemplate = {
  tipo: "resposta_rapida" | "link" | "telefone" | "copiar_codigo" | "outro"
  texto: string
  /** Só no botão de link. */
  url?: string
  /** Só no botão de ligar, com o código do país. */
  telefone?: string
}

export type PartesDoTemplate = {
  cabecalho: { tipo: TipoDeCabecalho; texto?: string } | null
  corpo: string
  rodape: string | null
  botoes: BotaoDoTemplate[]
}

/** Rótulo em português de um cabeçalho de mídia, para a prévia mostrar no lugar do arquivo. */
export const ROTULO_DO_CABECALHO: Record<Exclude<TipoDeCabecalho, "texto">, string> = {
  imagem: "Imagem",
  video: "Vídeo",
  documento: "Documento",
  localizacao: "Localização",
}

/** B54-02: a Meta só deixa editar template aprovado, rejeitado ou pausado. */
export const PODE_EDITAR = new Set(["APPROVED", "REJECTED", "PAUSED"])

/** B54-02: a Meta aceita até três botões por template (fora os de carrossel e lista, que não entram aqui). */
export const MAXIMO_DE_BOTOES = 3

const FORMATO_DO_CABECALHO: Record<string, TipoDeCabecalho> = {
  TEXT: "texto",
  IMAGE: "imagem",
  VIDEO: "video",
  DOCUMENT: "documento",
  LOCATION: "localizacao",
}
const FORMATO_PARA_META: Record<TipoDeCabecalho, string> = {
  texto: "TEXT",
  imagem: "IMAGE",
  video: "VIDEO",
  documento: "DOCUMENT",
  localizacao: "LOCATION",
}

const TIPO_DO_BOTAO: Record<string, BotaoDoTemplate["tipo"]> = {
  QUICK_REPLY: "resposta_rapida",
  URL: "link",
  PHONE_NUMBER: "telefone",
  COPY_CODE: "copiar_codigo",
}
const TIPO_PARA_META: Record<BotaoDoTemplate["tipo"], string> = {
  resposta_rapida: "QUICK_REPLY",
  link: "URL",
  telefone: "PHONE_NUMBER",
  copiar_codigo: "COPY_CODE",
  outro: "QUICK_REPLY",
}

type ComponenteDaMeta = {
  type?: string
  format?: string
  text?: string
  buttons?: Array<{ type?: string; text?: string; url?: string; phone_number?: string }>
}

/**
 * Converte o `components` da Meta nas partes do template. Devolve `null` quando a Meta
 * não mandou nada (lista vazia ou ausente), para a tela avisar em vez de mostrar um
 * balão em branco.
 */
export function partesDoTemplate(components: unknown): PartesDoTemplate | null {
  if (!Array.isArray(components) || components.length === 0) return null
  const partes: PartesDoTemplate = { cabecalho: null, corpo: "", rodape: null, botoes: [] }

  for (const c of components as ComponenteDaMeta[]) {
    switch (c.type) {
      case "HEADER": {
        const tipo = FORMATO_DO_CABECALHO[c.format ?? "TEXT"] ?? "texto"
        partes.cabecalho = tipo === "texto" ? { tipo, texto: c.text ?? "" } : { tipo }
        break
      }
      case "BODY":
        partes.corpo = c.text ?? ""
        break
      case "FOOTER":
        partes.rodape = c.text ?? null
        break
      case "BUTTONS":
        partes.botoes = (c.buttons ?? []).map((b) => ({
          tipo: TIPO_DO_BOTAO[b.type ?? ""] ?? "outro",
          texto: b.text ?? "",
          ...(b.url !== undefined ? { url: b.url } : {}),
          ...(b.phone_number !== undefined ? { telefone: b.phone_number } : {}),
        }))
        break
    }
  }
  return partes
}

/** Quantas variáveis `{{n}}` um texto tem (a maior numerada). */
export function quantidadeDeVariaveis(texto: string): number {
  let maior = 0
  for (const m of texto.matchAll(/\{\{(\d+)\}\}/g)) maior = Math.max(maior, Number(m[1]))
  return maior
}

/**
 * Os exemplos que a Meta exige para cada variável. A tela pede um por variável
 * (SUP-B54-09, decidido pela Marcelle em 30/10/2026); quando faltar algum, entra
 * "Exemplo n" para a Meta não recusar por formato.
 */
export type ExemplosDoTemplate = {
  /** Um por `{{n}}` do corpo, na ordem. */
  corpo?: string[]
  /** Um por `{{n}}` do cabeçalho de texto, na ordem. */
  cabecalho?: string[]
  /** Pelo índice do botão de link cuja URL tem variável. */
  links?: Record<number, string>
}

export function exemplosDasVariaveis(texto: string, informados: string[] = []): string[] {
  return Array.from({ length: quantidadeDeVariaveis(texto) }, (_, i) => informados[i]?.trim() || `Exemplo ${i + 1}`)
}

/**
 * B54-02: monta o `components` que a Graph API espera ao criar ou editar um template.
 *
 * A Meta exige exemplo para toda variável (corpo, cabeçalho de texto e URL de botão) e o
 * `header_handle` do arquivo de exemplo quando o cabeçalho é mídia. Sem o handle, o
 * cabeçalho de mídia não entra: quem chama confere antes (CA-B54-08).
 */
export function componentsParaMeta(
  partes: PartesDoTemplate,
  opcoes: { headerHandle?: string | null; exemplos?: ExemplosDoTemplate } = {}
): Array<Record<string, unknown>> {
  const components: Array<Record<string, unknown>> = []
  const informados = opcoes.exemplos ?? {}

  if (partes.cabecalho) {
    const { tipo, texto } = partes.cabecalho
    if (tipo === "texto") {
      const exemplos = exemplosDasVariaveis(texto ?? "", informados.cabecalho)
      components.push({
        type: "HEADER",
        format: "TEXT",
        text: texto ?? "",
        ...(exemplos.length > 0 ? { example: { header_text: exemplos } } : {}),
      })
    } else if (tipo === "localizacao") {
      components.push({ type: "HEADER", format: "LOCATION" })
    } else if (opcoes.headerHandle) {
      components.push({
        type: "HEADER",
        format: FORMATO_PARA_META[tipo],
        example: { header_handle: [opcoes.headerHandle] },
      })
    }
  }

  const exemplosDoCorpo = exemplosDasVariaveis(partes.corpo, informados.corpo)
  components.push({
    type: "BODY",
    text: partes.corpo,
    ...(exemplosDoCorpo.length > 0 ? { example: { body_text: [exemplosDoCorpo] } } : {}),
  })

  if (partes.rodape) components.push({ type: "FOOTER", text: partes.rodape })

  if (partes.botoes.length > 0) {
    components.push({
      type: "BUTTONS",
      buttons: partes.botoes.map((b, i) => {
        const botao: Record<string, unknown> = { type: TIPO_PARA_META[b.tipo], text: b.texto }
        if (b.tipo === "link") {
          botao.url = b.url ?? ""
          if (quantidadeDeVariaveis(b.url ?? "") > 0) {
            const exemplo = informados.links?.[i]?.trim()
            botao.example = [exemplo || (b.url ?? "").replace(/\{\{\d+\}\}/g, "exemplo")]
          }
        }
        if (b.tipo === "telefone") botao.phone_number = b.telefone ?? ""
        return botao
      }),
    })
  }

  return components
}

// ── B54-02: avisos e motivos da Meta em português ─────────────────────

export const AVISO_SEM_EXEMPLO_DO_CABECALHO = "Anexe um exemplo do arquivo do cabeçalho para a análise da Meta"
export const AVISO_LIMITE_DE_EDICOES = "A Meta não aceitou: limite de edições deste template atingido"
export const AVISO_NOME_EM_USO = "Já existe um template com este nome; apagado há menos de 30 dias, o nome ainda está bloqueado"

type ErroDaMeta = { code?: number; error_subcode?: number; message?: string; error_user_msg?: string }

/**
 * O motivo de uma recusa da Meta em português quando o conhecemos; senão, o texto dela.
 * O limite de edições (10 em 30 dias, 1 por dia) e o nome em uso são os dois que a tela
 * promete traduzir (CA-B54-09, cenário de erro).
 */
export function motivoDaRecusaDaMeta(erro: ErroDaMeta | undefined, padrao: string): string {
  const texto = `${erro?.message ?? ""} ${erro?.error_user_msg ?? ""}`.toLowerCase()
  if (erro?.error_subcode === 2388024 || erro?.error_subcode === 2388023 || (texto.includes("edit") && texto.includes("limit")))
    return AVISO_LIMITE_DE_EDICOES
  if (erro?.error_subcode === 2388025 || texto.includes("already exists") || texto.includes("name is already"))
    return AVISO_NOME_EM_USO
  return erro?.error_user_msg ?? erro?.message ?? padrao
}
