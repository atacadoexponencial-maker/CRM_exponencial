import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarEtiquetas } from "./actions"
import { EtiquetasClient } from "./etiquetas-client"

export default async function EtiquetasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil")

  const etiquetas = await listarEtiquetas()

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <EtiquetasClient etiquetasIniciais={etiquetas} />
    </div>
  )
}
