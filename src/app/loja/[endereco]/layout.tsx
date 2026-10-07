import type { Metadata } from "next"
import { carregarLojaPublica } from "@/lib/catalogo/loja-publica"

// A aba do navegador e a prévia do link no WhatsApp mostram a loja, nunca o CRM.
export async function generateMetadata({ params }: { params: Promise<{ endereco: string }> }): Promise<Metadata> {
  const { endereco } = await params
  const loja = await carregarLojaPublica(endereco)
  if (!loja) return { title: "Catálogo indisponível", robots: { index: false }, icons: { icon: "data:," } }
  const descricao = loja.tema.boasVindas || `Catálogo de ${loja.tema.nomeLoja}`
  // O WhatsApp não mostra SVG na prévia do link: usa o banner, ou a logo se não for SVG.
  const logoRaster = loja.tema.logoUrl && !loja.tema.logoUrl.endsWith(".svg") ? loja.tema.logoUrl : null
  const imagem = loja.tema.bannerUrl ?? logoRaster
  return {
    title: loja.tema.nomeLoja,
    description: descricao,
    // Ícone da aba: a logo da loja; sem logo, nenhum (nunca o ícone do CRM).
    icons: { icon: loja.tema.logoUrl ?? "data:," },
    openGraph: { title: loja.tema.nomeLoja, description: descricao, type: "website", ...(imagem ? { images: [imagem] } : {}) },
  }
}

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  // [&>*]:flex-1: o fundo da loja cobre a tela mesmo com poucos produtos.
  return <div className="min-h-screen flex flex-col [&>*]:flex-1">{children}</div>
}
