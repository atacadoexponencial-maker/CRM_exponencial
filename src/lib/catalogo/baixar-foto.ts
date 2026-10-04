// Fotos por link na importação (B18-03), só no servidor. O link vem de quem usa o sistema:
// nunca deixa o servidor abrir endereço da rede interna, nem por redirecionamento.

import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { FORMATOS_FOTO, TAMANHO_MAX_FOTO } from "./regras"

const PRAZO_MS = 15_000
const MAX_REDIRECIONAMENTOS = 3

export type FotoBaixada = { ok: true; bytes: Uint8Array; tipo: string; extensao: string } | { ok: false; motivo: string }

/** IP de rede interna, loopback, link-local ou reservado (v4 e v6). */
export function ipInterno(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number)
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  const v6 = ip.toLowerCase()
  if (v6.startsWith("::ffff:")) return ipInterno(v6.slice(7))
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80")
}

async function enderecoPermitido(url: URL): Promise<boolean> {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false
  if (isIP(host)) return !ipInterno(host)
  try {
    const ips = await lookup(host, { all: true })
    return ips.length > 0 && ips.every((e) => !ipInterno(e.address))
  } catch {
    return false
  }
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
      if (!(await enderecoPermitido(url))) return { ok: false, motivo: "não abriu (endereço não permitido)" }
      resposta = await fetch(url, { redirect: "manual", signal: controle.signal, headers: { Accept: "image/*" } })
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
  } catch {
    return { ok: false, motivo: controle.signal.aborted ? "não abriu (demorou demais)" : "não abriu (link quebrado)" }
  } finally {
    clearTimeout(prazo)
  }
}
