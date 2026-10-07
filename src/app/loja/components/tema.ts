// Tema da vitrine: a marca do lojista. Usado na vitrine pública e na prévia da tela de
// Aparência do CRM (B16-02, B16-08).

import type { IdFonte } from "./fontes"

export type LayoutVitrine = "grade" | "lista" | "destaque"

export interface TemaLoja {
  nomeLoja: string
  boasVindas: string
  logoUrl: string | null
  bannerUrl: string | null
  /** Hex "#rrggbb": botões, preços, destaques. */
  corPrincipal: string
  /** Hex "#rrggbb": fundo da página. */
  corFundo: string
  fonteId: IdFonte
  layout: LayoutVitrine
}

export const TEMA_PADRAO: TemaLoja = {
  nomeLoja: "Minha loja",
  boasVindas: "",
  logoUrl: null,
  bannerUrl: null,
  corPrincipal: "#1f2937",
  corFundo: "#ffffff",
  fonteId: "inter",
  layout: "grade",
}

const PRETO = "#111111"
const BRANCO = "#ffffff"

function paraRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function corValida(hex: string): boolean {
  return paraRgb(hex) !== null
}

/** Luminância relativa (WCAG 2.x). */
export function luminancia(hex: string): number {
  const rgb = paraRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste entre duas cores (1 a 21). */
export function razaoContraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

/** Preto ou branco, o que contrastar mais com a cor dada. */
export function corTextoSobre(hex: string): string {
  return razaoContraste(hex, PRETO) >= razaoContraste(hex, BRANCO) ? PRETO : BRANCO
}

/** Mínimo WCAG para elementos gráficos e texto grande (botões e preços sobre o fundo). */
export const CONTRASTE_MINIMO = 3

/** Aviso quando a cor principal some no fundo; `null` quando está legível. */
export function avisoContraste(tema: Pick<TemaLoja, "corPrincipal" | "corFundo">): string | null {
  if (!corValida(tema.corPrincipal) || !corValida(tema.corFundo)) return null
  return razaoContraste(tema.corPrincipal, tema.corFundo) < CONTRASTE_MINIMO
    ? "A cor principal está parecida demais com o fundo: botões e preços ficam difíceis de ver."
    : null
}

/** Cores prontas para a vitrine desenhar (texto e bordas derivados do fundo). */
export function coresDaVitrine(tema: Pick<TemaLoja, "corPrincipal" | "corFundo">) {
  const fundo = corValida(tema.corFundo) ? tema.corFundo : TEMA_PADRAO.corFundo
  const principal = corValida(tema.corPrincipal) ? tema.corPrincipal : TEMA_PADRAO.corPrincipal
  const texto = corTextoSobre(fundo)
  return {
    fundo,
    principal,
    texto,
    sobrePrincipal: corTextoSobre(principal),
    suave: `color-mix(in srgb, ${texto} 60%, ${fundo})`,
    superficie: `color-mix(in srgb, ${texto} 5%, ${fundo})`,
    borda: `color-mix(in srgb, ${texto} 12%, ${fundo})`,
  }
}
