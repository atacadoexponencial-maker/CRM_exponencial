import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarEtiquetas } from "./actions"
import { EtiquetasClient } from "./etiquetas-client"

export const metadata = { title: "Etiquetas" }

export default async function EtiquetasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const etiquetas = await listarEtiquetas()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 lg:px-10">
      <EtiquetasClient etiquetasIniciais={etiquetas} />
    </div>
  )
}
