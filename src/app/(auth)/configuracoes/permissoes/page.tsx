import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { carregarPermissoes } from "./actions"
import { PermissoesClient } from "./permissoes-client"

export const metadata = { title: "Permissões" }

export default async function PermissoesPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  const permissoes = await carregarPermissoes()
  if (!permissoes) redirect("/perfil?motivo=sem-permissao")

  return (
    <div className={CLASSE_DA_PAGINA}>
      <PermissoesClient inicial={permissoes} />
    </div>
  )
}
