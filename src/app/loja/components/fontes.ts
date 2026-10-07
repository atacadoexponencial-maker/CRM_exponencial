// Fontes que o lojista pode escolher para a vitrine. Pelo next/font/google, os arquivos
// são baixados no build e servidos pelo próprio CRM: a vitrine não chama o Google.

import type { IDS_FONTE } from "@/lib/catalogo/regras"
import { DM_Serif_Display, Inter, Lora, Montserrat, Nunito, Playfair_Display, Poppins, Space_Grotesk } from "next/font/google"

const inter = Inter({ subsets: ["latin"], display: "swap" })
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" })
const montserrat = Montserrat({ subsets: ["latin"], display: "swap" })
const nunito = Nunito({ subsets: ["latin"], display: "swap" })
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], display: "swap" })
const playfair = Playfair_Display({ subsets: ["latin"], display: "swap" })
const lora = Lora({ subsets: ["latin"], display: "swap" })
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: ["400"], display: "swap" })

export type IdFonte = (typeof IDS_FONTE)[number]

export const FONTES: { id: IdFonte; nome: string; estilo: string; familia: string }[] = [
  { id: "inter", nome: "Inter", estilo: "Neutra e moderna", familia: inter.style.fontFamily },
  { id: "poppins", nome: "Poppins", estilo: "Geométrica, amigável", familia: poppins.style.fontFamily },
  { id: "montserrat", nome: "Montserrat", estilo: "Marcante, urbana", familia: montserrat.style.fontFamily },
  { id: "nunito", nome: "Nunito", estilo: "Arredondada, suave", familia: nunito.style.fontFamily },
  { id: "space-grotesk", nome: "Space Grotesk", estilo: "Tech, despojada", familia: spaceGrotesk.style.fontFamily },
  { id: "playfair", nome: "Playfair Display", estilo: "Elegante, editorial", familia: playfair.style.fontFamily },
  { id: "lora", nome: "Lora", estilo: "Clássica, acolhedora", familia: lora.style.fontFamily },
  { id: "dm-serif", nome: "DM Serif Display", estilo: "Sofisticada, de vitrine", familia: dmSerif.style.fontFamily },
]

export function familiaDaFonte(id: IdFonte): string {
  return (FONTES.find((f) => f.id === id) ?? FONTES[0]).familia
}
