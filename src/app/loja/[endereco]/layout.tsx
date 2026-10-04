import type { Metadata } from "next"
import { carregarLojaPublica } from "@/lib/catalogo/loja-publica"

// A aba do navegador e a prévia do link no WhatsApp mostram a loja, nunca o CRM.
export async function generateMetadata({ params }: { params: Promise<{ endereco: string }> }): Promise<Metadata> {
  const { endereco } = await params
  const loja = await carregarLojaPublica(endereco)
  if (!loja) return { title: "Catálogo indisponível", robots: { index: false } }
  const descricao = loja.tema.boasVindas || `Catálogo de ${loja.tema.nomeLoja}`
  return {
    title: loja.tema.nomeLoja,
    description: descricao,
    openGraph: { title: loja.tema.nomeLoja, description: descricao, type: "website", ...(loja.tema.logoUrl ? { images: [loja.tema.logoUrl] } : {}) },
  }
}

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  // [&>*]:flex-1: o fundo da loja cobre a tela mesmo com poucos produtos.
  return <div className="min-h-screen flex flex-col [&>*]:flex-1">{children}</div>
}
