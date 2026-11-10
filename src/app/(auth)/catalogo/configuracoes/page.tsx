import { redirect } from "next/navigation"
import { enderecoDoApp } from "@/lib/endereco-do-app"
import { sessaoAtual } from "@/lib/sessao"
import { carregarConfiguracoes } from "./actions"
import { ConfiguracoesClient } from "./configuracoes-client"

export const metadata = { title: "Configurações do catálogo" }

export default async function ConfiguracoesCatalogoPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil?motivo=sem-permissao")

  const dados = await carregarConfiguracoes()
  if (!dados) redirect("/perfil")

  // Detalhes da auditoria (09/11/2026): o link da loja usa o endereço do deploy, como os
  // links de e-mail desde a pista 6, e não o host da requisição, que é de quem pede.
  return <ConfiguracoesClient inicial={dados.config} prefixoLink={`${enderecoDoApp()}/loja/`} />
}
