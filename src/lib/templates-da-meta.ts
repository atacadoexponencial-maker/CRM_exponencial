// B54-01: a leitura do `components` que a Graph API devolve para um template de
// mensagem (WhatsApp Message Template). Só tipo e conversão, sem React nem rede: a
// tela de templates e, nas próximas issues, a campanha usam a mesma estrutura.

export type TipoDeCabecalho = "texto" | "imagem" | "video" | "documento" | "localizacao"

export type BotaoDoTemplate = {
  tipo: "resposta_rapida" | "link" | "telefone" | "copiar_codigo" | "outro"
  texto: string
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

const FORMATO_DO_CABECALHO: Record<string, TipoDeCabecalho> = {
  TEXT: "texto",
  IMAGE: "imagem",
  VIDEO: "video",
  DOCUMENT: "documento",
  LOCATION: "localizacao",
}

const TIPO_DO_BOTAO: Record<string, BotaoDoTemplate["tipo"]> = {
  QUICK_REPLY: "resposta_rapida",
  URL: "link",
  PHONE_NUMBER: "telefone",
  COPY_CODE: "copiar_codigo",
}

type ComponenteDaMeta = {
  type?: string
  format?: string
  text?: string
  buttons?: Array<{ type?: string; text?: string }>
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
        }))
        break
    }
  }
  return partes
}
