import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import { PrototipoPedidosClient } from "./prototipo-pedidos-client"

/** Lido uma vez por requisição, no servidor; o navegador recebe o mesmo valor. */
function agoraDoServidor(): number {
  return Date.now()
}

// Pedidos: todos os papéis (Atendente também).
export default async function PrototipoPedidosPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  if (!perfil) redirect("/perfil")

  return <PrototipoPedidosClient agoraMs={agoraDoServidor()} papel={perfil.role} />
}
