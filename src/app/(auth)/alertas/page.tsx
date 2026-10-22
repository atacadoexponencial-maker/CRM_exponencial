import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarAlertas } from "./actions"
import { AlertasClient } from "./alertas-client"

export const metadata = { title: "Alertas" }

export default async function AlertasPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const dados = await listarAlertas()
  if (!dados) redirect("/login")

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-8 lg:px-10">
      <AlertasClient
        alertasIniciais={dados.alertas}
        alertasDeNumero={dados.alertasDeNumero}
        configInicial={dados.config}
        papel={perfil?.role ?? "atendente"}
      />
    </div>
  )
}
