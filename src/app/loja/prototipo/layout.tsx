import type { Metadata } from "next"
import { TEMA_LOJA } from "./dados-exemplo"

// A aba e a prévia do link mostram a loja, não o CRM.
export const metadata: Metadata = {
  title: TEMA_LOJA.nomeLoja,
  description: TEMA_LOJA.boasVindas,
  robots: { index: false },
}

export default function PrototipoLojaLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col">{children}</div>
}
