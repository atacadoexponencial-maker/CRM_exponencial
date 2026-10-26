import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { PerfilContato } from "./components/perfil-contato"
import { buscarDadosContato, listarAtendentesAtivos } from "../actions"
import { estadoNaLixeira } from "../lixeira/actions"
import { atendenteSugerido } from "@/lib/compras"
import { camposDoContato } from "../campos-personalizados"

export const metadata = { title: "Contato" }

interface Props {
  params: Promise<{ id: string }>
}

export default async function PerfilContatoPage({ params }: Props) {
  const { id } = await params

  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  const podeRegistrarCompra = perfil?.role === "admin" || perfil?.role === "gerente"
  const [contato, atendentes, camposPersonalizados] = await Promise.all([
    buscarDadosContato(id),
    // B30-01: a lista do seletor de atendente só serve a quem pode registrar compra.
    podeRegistrarCompra ? listarAtendentesAtivos() : Promise.resolve([]),
    // B38-01: campos da empresa com o valor deste contato.
    camposDoContato(id),
  ])
  // B13-04: não veio porque está na lixeira? O perfil mostra o aviso com "Restaurar".
  const naLixeira = contato ? null : await estadoNaLixeira(id)

  return (
    <PerfilContato
      contato={contato}
      contactId={id}
      naLixeira={naLixeira}
      papel={perfil?.role ?? "atendente"}
      atendentes={atendentes}
      atendenteSugeridoId={contato ? atendenteSugerido(contato.atendenteId, user.id) : null}
      camposPersonalizados={camposPersonalizados ?? []}
    />
  )
}
