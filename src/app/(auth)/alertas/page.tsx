import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarAlertas } from "./actions"
import { AlertasClient } from "./alertas-client"

export default async function AlertasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const dados = await listarAlertas()
  if (!dados) redirect("/login")

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      <AlertasClient
        alertasIniciais={dados.alertas}
        alertasDeNumero={dados.alertasDeNumero}
        configInicial={dados.config}
        papel={perfil?.role ?? "atendente"}
      />
    </div>
  )
}
