import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { listarLixeira } from "./actions"
import { LixeiraClient } from "./lixeira-client"

export const metadata = { title: "Lixeira" }

export default async function LixeiraPage() {
  const { user } = await sessaoAtual()
  if (!user) redirect("/login")

  const itens = await listarLixeira()
  return <LixeiraClient itens={itens} />
}
