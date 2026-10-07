import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { carregarVitrine } from "@/lib/catalogo/loja-publica"
import { textoDoMinimo, type MinimoPedido } from "@/app/loja/components/pedido"
import { carregarTema } from "./actions"
import { carregarConfiguracoes } from "../configuracoes/actions"
import { AparenciaClient } from "./aparencia-client"

export default async function AparenciaPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  // A prévia mostra os produtos visíveis da própria empresa, como a cliente vai ver.
  const [tema, vitrine, dados] = await Promise.all([carregarTema(), carregarVitrine(perfil.workspace_id), carregarConfiguracoes()])
  if (!tema) redirect("/perfil")
  const minimo: MinimoPedido = dados?.config.minimo ?? { tipo: "nenhum", valor: null }

  return <AparenciaClient inicial={tema} categorias={vitrine.categorias} produtos={vitrine.produtos} avisoMinimo={textoDoMinimo(minimo)} />
}
