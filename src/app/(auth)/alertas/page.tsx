import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarAlertas } from "./actions"
import { AlertasClient } from "./alertas-client"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Alertas" }

export default async function AlertasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const dados = await listarAlertas()
  if (!dados) redirect("/login")

  return (
    <div className={CLASSE_DA_PAGINA}>
      <AlertasClient
        alertasIniciais={dados.alertas}
        alertasDeNumero={dados.alertasDeNumero}
        configInicial={dados.config}
        papel={perfil?.role ?? "atendente"}
      />
    </div>
  )
}
