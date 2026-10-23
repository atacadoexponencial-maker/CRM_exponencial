import type { Metadata } from "next"
import { Landing } from "./_landing/landing"
import { DESCRICAO_ABA, TITULO_ABA, VIDEOS } from "./_landing/conteudo"

// B24-01: a raiz é a landing pública do crmatacado exp, o site que a Meta confere na
// verificação de acesso. Abre sem login e também para quem já está logado; o porteiro
// (src/middleware.ts) já trata "/" como rota pública.
export const metadata: Metadata = {
  title: { absolute: TITULO_ABA },
  description: DESCRICAO_ABA,
  openGraph: {
    title: TITULO_ABA,
    description: DESCRICAO_ABA,
    type: "website",
    locale: "pt_BR",
    images: [{ url: VIDEOS.caixaDeEntrada.base + ".png", width: VIDEOS.caixaDeEntrada.largura, height: VIDEOS.caixaDeEntrada.altura, alt: VIDEOS.caixaDeEntrada.alt }],
  },
}

export default function Home() {
  return <Landing />
}
