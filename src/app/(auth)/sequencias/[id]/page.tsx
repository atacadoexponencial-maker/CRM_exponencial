import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { buscarSequencia } from "../actions"
import { EditorSequenciaClient } from "./editor-client"

export const metadata = { title: "Sequência" }

export default async function EditorSequenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  // Editor disponível apenas para Admin
  if (perfil?.role !== "admin") redirect("/sequencias")

  const sequencia = id === "nova" ? null : await buscarSequencia(id)
  if (id !== "nova" && !sequencia) redirect("/sequencias")

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-8 lg:px-10">
      <EditorSequenciaClient sequencia={sequencia} />
    </div>
  )
}
