import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { carregarConfiguracoes } from "./actions"
import { ConfiguracoesClient } from "./configuracoes-client"

export default async function ConfiguracoesCatalogoPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  const dados = await carregarConfiguracoes()
  if (!dados) redirect("/perfil")

  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "crm-exponencial.vercel.app"
  const protocolo = h.get("x-forwarded-proto") ?? "https"
  return <ConfiguracoesClient inicial={dados.config} prefixoLink={`${protocolo}://${host}/loja/`} />
}
