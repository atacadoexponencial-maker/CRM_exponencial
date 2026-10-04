import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarCatalogo } from "./actions"
import { carregarConfiguracoes } from "./configuracoes/actions"
import { ProdutosClient } from "./produtos-client"

export default async function CatalogoPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  const [catalogo, dados] = await Promise.all([listarCatalogo(), carregarConfiguracoes()])
  const cfg = dados?.config
  return <ProdutosClient inicial={catalogo} hrefLoja={cfg?.publicado && cfg.endereco ? `/loja/${cfg.endereco}` : null} />
}
