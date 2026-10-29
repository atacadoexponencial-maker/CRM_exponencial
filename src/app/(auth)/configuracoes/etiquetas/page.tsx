import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarEtiquetas } from "./actions"
import { EtiquetasClient } from "./etiquetas-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Etiquetas" }

export default async function EtiquetasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const etiquetas = await listarEtiquetas()

  return (
    <div className={CLASSE_DA_PAGINA}>
      <EtiquetasClient etiquetasIniciais={etiquetas} />
    </div>
  )
}
