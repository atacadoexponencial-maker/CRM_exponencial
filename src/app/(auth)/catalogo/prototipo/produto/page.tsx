import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { PrototipoEditorClient } from "./prototipo-editor-client"

export default async function PrototipoEditorPage({ searchParams }: { searchParams: Promise<{ id?: string; novo?: string }> }) {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (perfil?.role !== "admin" && perfil?.role !== "gerente") redirect("/perfil")

  const { id, novo } = await searchParams
  return <PrototipoEditorClient produtoId={novo ? null : (id ?? null)} />
}
