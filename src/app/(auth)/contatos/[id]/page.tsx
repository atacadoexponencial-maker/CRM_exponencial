import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { PerfilContato } from "./components/perfil-contato"
import { buscarDadosContato } from "../actions"
import { estadoNaLixeira } from "../lixeira/actions"

export const metadata = { title: "Contato" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function PerfilContatoPage({ params }: Props) {
  const { id } = await params

  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const contato = await buscarDadosContato(id)
  // B13-04: não veio porque está na lixeira? O perfil mostra o aviso com "Restaurar".
  const naLixeira = contato ? null : await estadoNaLixeira(id)

  return (
    <PerfilContato
      contato={contato}
      contactId={id}
      naLixeira={naLixeira}
      papel={perfil?.role ?? "atendente"}
    />
  )
}
