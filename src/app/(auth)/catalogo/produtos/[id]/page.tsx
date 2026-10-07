import { notFound, redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { carregarProduto, listarCatalogo } from "../../actions"
import type { ProdutoEditavel } from "../../components/editor-produto"
import { EditorClient } from "./editor-client"

const PRODUTO_NOVO: ProdutoEditavel = {
  id: null, nome: "", descricao: "", preco: null, precoDe: null, codigo: "", categoriaId: null,
  visivel: true, destaque: false, fotos: [], tipos: [], estoque: { "": 0 },
}

export default async function EditorProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  const { id } = await params
  const [{ categorias }, produto] = await Promise.all([listarCatalogo(), id === "nova" ? Promise.resolve(PRODUTO_NOVO) : carregarProduto(id)])
  if (!produto) notFound()

  return <EditorClient inicial={produto} categorias={categorias} />
}
