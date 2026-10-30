// Perfil comercial do número da API Oficial da Meta: o que o cliente vê ao abrir
// o contato da empresa no WhatsApp (foto, recado, descrição, endereço, e-mail,
// sites e categoria).
//
// Recebe as credenciais prontas, como o `provider-meta.ts`: quem consulta o
// banco é a action, e assim este arquivo é testável com `fetch` simulado.
//
// O nome exibido (`verified_name`) NÃO é editável pela API — só no WhatsApp
// Manager, com revisão da Meta. Por isso ele não aparece aqui.
//
// Referência: Graph API `/{phone-number-id}/whatsapp_business_profile` e a
// Resumable Upload API (`/{app-id}/uploads`) para a foto.

import { z } from "zod"

const VERSAO_API = "v21.0"
const GRAPH = `https://graph.facebook.com/${VERSAO_API}`

/** Limites de caracteres da Meta para cada campo. */
export const LIMITES_PERFIL = {
  about: 139,
  description: 512,
  address: 256,
  email: 128,
  website: 256,
  sites: 2,
} as const

/** Foto: JPEG ou PNG. A Meta aceita até 5 MB, mas o corpo de uma requisição na
 * Vercel para em 4,5 MB; o teto fica em 4 MB para sobrar folga ao FormData. */
export const FOTO_PERFIL = {
  formatos: ["image/jpeg", "image/png"] as readonly string[],
  limiteBytes: 4 * 1024 * 1024,
}

/** Categorias ("vertical") da Meta, com o rótulo que a tela mostra. */
export const CATEGORIAS_PERFIL: ReadonlyArray<{ valor: string; rotulo: string }> = [
  { valor: "UNDEFINED", rotulo: "Sem categoria" },
  { valor: "APPAREL", rotulo: "Roupas e acessórios" },
  { valor: "AUTO", rotulo: "Automotivo" },
  { valor: "BEAUTY", rotulo: "Beleza, spa e salão" },
  { valor: "EDU", rotulo: "Educação" },
  { valor: "ENTERTAIN", rotulo: "Entretenimento" },
  { valor: "EVENT_PLAN", rotulo: "Eventos" },
  { valor: "FINANCE", rotulo: "Finanças" },
  { valor: "GROCERY", rotulo: "Mercado e alimentos" },
  { valor: "GOVT", rotulo: "Serviço público" },
  { valor: "HOTEL", rotulo: "Hotelaria" },
  { valor: "HEALTH", rotulo: "Saúde" },
  { valor: "NONPROFIT", rotulo: "Organização sem fins lucrativos" },
  { valor: "PROF_SERVICES", rotulo: "Serviços profissionais" },
  { valor: "RETAIL", rotulo: "Varejo e atacado" },
  { valor: "RESTAURANT", rotulo: "Restaurante" },
  { valor: "TRAVEL", rotulo: "Viagem e transporte" },
  { valor: "OTHER", rotulo: "Outro" },
]

const VALORES_DE_CATEGORIA = CATEGORIAS_PERFIL.map((c) => c.valor) as [string, ...string[]]

export type PerfilComercial = {
  about: string
  description: string
  address: string
  email: string
  websites: string[]
  vertical: string
  fotoUrl: string | null
}

const texto = (max: number, nome: string) =>
  z.string().trim().max(max, `${nome} passa de ${max} caracteres.`)

/** O que a tela manda para salvar. Validado aqui, no servidor. */
export const esquemaPerfilComercial = z.object({
  about: texto(LIMITES_PERFIL.about, "O recado"),
  description: texto(LIMITES_PERFIL.description, "A descrição"),
  address: texto(LIMITES_PERFIL.address, "O endereço"),
  email: z.union([
    z.literal(""),
    z.string().trim().max(LIMITES_PERFIL.email, `O e-mail passa de ${LIMITES_PERFIL.email} caracteres.`).email("E-mail inválido."),
  ]),
  websites: z
    .array(z.string().trim().max(LIMITES_PERFIL.website, `Um site passa de ${LIMITES_PERFIL.website} caracteres.`))
    .max(LIMITES_PERFIL.sites, `No máximo ${LIMITES_PERFIL.sites} sites.`)
    .transform((lista) => lista.filter((s) => s !== ""))
    .pipe(
      z.array(
        z.string().refine((s) => /^https?:\/\/\S+\.\S+/i.test(s), "Site inválido. Use o endereço completo, com https://.")
      )
    ),
  vertical: z.enum(VALORES_DE_CATEGORIA),
})

export type EntradaPerfilComercial = z.input<typeof esquemaPerfilComercial>

export type Credenciais = { phoneNumberId: string; accessToken: string }

type RespostaGraph = { data?: Array<Record<string, unknown>>; error?: { message?: string } }

async function lerErro(res: Response): Promise<string> {
  const corpo = await res.text()
  try {
    const json = JSON.parse(corpo) as RespostaGraph
    return json.error?.message ?? corpo
  } catch {
    return corpo
  }
}

/** Lê o perfil comercial atual. */
export async function lerPerfilComercial(
  cred: Credenciais
): Promise<{ perfil: PerfilComercial } | { erro: string }> {
  const campos = "about,address,description,email,profile_picture_url,websites,vertical"
  const res = await fetch(`${GRAPH}/${cred.phoneNumberId}/whatsapp_business_profile?fields=${campos}`, {
    headers: { Authorization: `Bearer ${cred.accessToken}` },
    cache: "no-store",
  })
  if (!res.ok) return { erro: await lerErro(res) }

  const json = (await res.json()) as RespostaGraph
  const d = json.data?.[0] ?? {}
  const sites = Array.isArray(d.websites) ? (d.websites as unknown[]).filter((s): s is string => typeof s === "string") : []
  return {
    perfil: {
      about: typeof d.about === "string" ? d.about : "",
      description: typeof d.description === "string" ? d.description : "",
      address: typeof d.address === "string" ? d.address : "",
      email: typeof d.email === "string" ? d.email : "",
      websites: sites,
      vertical: typeof d.vertical === "string" && VALORES_DE_CATEGORIA.includes(d.vertical) ? d.vertical : "UNDEFINED",
      fotoUrl: typeof d.profile_picture_url === "string" ? d.profile_picture_url : null,
    },
  }
}

/**
 * Monta o corpo do POST. A Meta devolve o erro genérico 131000 quando recebe
 * campo vazio ou a categoria UNDEFINED (visto em 30/10/2026), então só vai o
 * que tem valor; um campo vazio só vai quando estava preenchido antes, para
 * conseguir limpá-lo. Exportada para o teste.
 */
export function montarAlteracoes(
  atual: PerfilComercial,
  dados: z.output<typeof esquemaPerfilComercial>
): Record<string, unknown> {
  const corpo: Record<string, unknown> = { messaging_product: "whatsapp" }
  const textos = ["about", "description", "address", "email"] as const
  for (const campo of textos) {
    if (dados[campo] !== "" || atual[campo] !== "") corpo[campo] = dados[campo]
  }
  if (dados.websites.length > 0 || atual.websites.length > 0) corpo.websites = dados.websites
  if (dados.vertical !== "UNDEFINED" || atual.vertical !== "UNDEFINED") corpo.vertical = dados.vertical
  return corpo
}

/** Grava os campos de texto e a categoria, a partir do perfil atual. */
export async function salvarPerfilComercial(
  cred: Credenciais,
  atual: PerfilComercial,
  dados: z.output<typeof esquemaPerfilComercial>
): Promise<{ erro?: string }> {
  const corpo = montarAlteracoes(atual, dados)
  // Nada além do messaging_product: não há o que mandar.
  if (Object.keys(corpo).length === 1) return {}

  const res = await fetch(`${GRAPH}/${cred.phoneNumberId}/whatsapp_business_profile`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cred.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
  })
  if (!res.ok) return { erro: await lerErro(res) }
  return {}
}

/**
 * Troca a foto de perfil em três passos da Meta: abre uma sessão de upload no
 * app, manda os bytes e recebe um "handle", e grava o handle no perfil.
 */
export async function trocarFotoDoPerfil(
  cred: Credenciais,
  appId: string,
  foto: { bytes: ArrayBuffer; tipo: string }
): Promise<{ erro?: string }> {
  const tamanho = foto.bytes.byteLength
  const sessao = await fetch(
    `${GRAPH}/${appId}/uploads?file_length=${tamanho}&file_type=${encodeURIComponent(foto.tipo)}`,
    { method: "POST", headers: { Authorization: `Bearer ${cred.accessToken}` } }
  )
  if (!sessao.ok) return { erro: await lerErro(sessao) }
  const { id: idSessao } = (await sessao.json()) as { id?: string }
  if (!idSessao) return { erro: "A Meta não abriu a sessão de upload." }

  const envio = await fetch(`${GRAPH}/${idSessao}`, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${cred.accessToken}`,
      file_offset: "0",
      "Content-Type": foto.tipo,
    },
    body: foto.bytes,
  })
  if (!envio.ok) return { erro: await lerErro(envio) }
  const { h: handle } = (await envio.json()) as { h?: string }
  if (!handle) return { erro: "A Meta não devolveu o identificador da foto." }

  const grava = await fetch(`${GRAPH}/${cred.phoneNumberId}/whatsapp_business_profile`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cred.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", profile_picture_handle: handle }),
  })
  if (!grava.ok) return { erro: await lerErro(grava) }
  return {}
}
