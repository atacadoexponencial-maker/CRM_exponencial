// Fotos por link na importação (B18-03), só no servidor. O link vem de quem usa o sistema:
// nunca deixa o servidor abrir endereço da rede interna, nem por redirecionamento.

import { lookup } from "node:dns"
import { isIP, type LookupFunction } from "node:net"
import ipaddr from "ipaddr.js"
import { Agent, fetch, type Response } from "undici"
import { FORMATOS_FOTO, TAMANHO_MAX_FOTO } from "./regras"

const PRAZO_MS = 15_000
const MAX_REDIRECIONAMENTOS = 3

export type FotoBaixada = { ok: true; bytes: Uint8Array; tipo: string; extensao: string } | { ok: false; motivo: string }

/**
 * B20-04: só a internet pública. Lista de permissão — a faixa precisa ser `unicast` —
 * em vez de lista de bloqueio: `ipaddr.process` desembrulha IPv4 dentro de IPv6
 * (`::ffff:a9fe:a9fe` é 169.254.169.254) e classifica as faixas reservadas.
 */
export function ipPermitido(ip: string): boolean {
  try {
    return ipaddr.process(ip).range() === "unicast"
  } catch {
    return false
  }
}

const NAO_PERMITIDO = "ENDERECO_NAO_PERMITIDO"

/**
 * Resolve o nome na hora de conectar e recusa se algum endereço não for público. A
 * conferência acontece com o IP que vai ser usado: o nome não pode apontar para fora na
 * conferência e para dentro no download (DNS rebinding).
 */
const lookupPermitido: LookupFunction = (hostname, opcoes, devolver) => {
  lookup(hostname, { family: opcoes.family ?? 0, all: true }, (erro, enderecos) => {
    if (erro) return devolver(erro, "")
    if (!enderecos.length || enderecos.some((e) => !ipPermitido(e.address))) {
      return devolver(Object.assign(new Error("endereço não permitido"), { code: NAO_PERMITIDO }), "")
    }
    if (opcoes.all) devolver(null, enderecos)
    else devolver(null, enderecos[0].address, enderecos[0].family)
  })
}

const conexaoSoPublica = new Agent({ connect: { lookup: lookupPermitido } })

/** Conferência antes de conectar: protocolo, nomes locais e IP escrito direto no link. */
function enderecoPermitido(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false
  // IP escrito direto no link não passa pelo lookup na conexão: confere aqui.
  if (isIP(host)) return ipPermitido(host)
  return true
}

function recusadoNaConexao(erro: unknown): boolean {
  for (let e = erro as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === NAO_PERMITIDO) return true
  }
  return false
}

/** Formato da imagem pelos primeiros bytes (não confia só no cabeçalho da resposta). */
function formatoPelosBytes(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg"
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png"
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp"
  return null
}

export async function baixarFoto(link: string): Promise<FotoBaixada> {
  let url: URL
  try {
    url = new URL(link)
  } catch {
    return { ok: false, motivo: "não abriu (link inválido)" }
  }
  const controle = new AbortController()
  const prazo = setTimeout(() => controle.abort(), PRAZO_MS)
  try {
    let resposta: Response | null = null
    for (let i = 0; i <= MAX_REDIRECIONAMENTOS; i++) {
      if (!enderecoPermitido(url)) return { ok: false, motivo: "não abriu (endereço não permitido)" }
      resposta = await fetch(url, {
        redirect: "manual",
        signal: controle.signal,
        headers: { Accept: "image/*" },
        dispatcher: conexaoSoPublica,
      })
      const destino = resposta.headers.get("location")
      if (resposta.status >= 300 && resposta.status < 400 && destino) {
        url = new URL(destino, url)
        continue
      }
      break
    }
    if (!resposta || !resposta.ok) return { ok: false, motivo: "não abriu (link quebrado)" }
    const declarado = Number(resposta.headers.get("content-length") ?? 0)
    if (declarado > TAMANHO_MAX_FOTO) return { ok: false, motivo: "passa de 5 MB" }

    // Lê aos poucos e para ao passar do limite.
    const leitor = resposta.body?.getReader()
    if (!leitor) return { ok: false, motivo: "não abriu (link quebrado)" }
    const partes: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      total += value.length
      if (total > TAMANHO_MAX_FOTO) {
        await leitor.cancel()
        return { ok: false, motivo: "passa de 5 MB" }
      }
      partes.push(value)
    }
    const bytes = new Uint8Array(total)
    let pos = 0
    for (const p of partes) { bytes.set(p, pos); pos += p.length }

    const tipo = formatoPelosBytes(bytes)
    if (!tipo || !FORMATOS_FOTO[tipo]) return { ok: false, motivo: "não é uma imagem JPG, PNG ou WebP" }
    return { ok: true, bytes, tipo, extensao: FORMATOS_FOTO[tipo] }
  } catch (erro) {
    if (recusadoNaConexao(erro)) return { ok: false, motivo: "não abriu (endereço não permitido)" }
    return { ok: false, motivo: controle.signal.aborted ? "não abriu (demorou demais)" : "não abriu (link quebrado)" }
  } finally {
    clearTimeout(prazo)
  }
}
