import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { fusoDaEmpresa } from "@/lib/fuso-da-empresa"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"
import { EmpresaClient } from "./empresa-client"

export const metadata = { title: "Empresa" }

export default async function EmpresaPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  return (
    <div className={CLASSE_DA_PAGINA}>
      <EmpresaClient fusoInicial={await fusoDaEmpresa()} />
    </div>
  )
}
