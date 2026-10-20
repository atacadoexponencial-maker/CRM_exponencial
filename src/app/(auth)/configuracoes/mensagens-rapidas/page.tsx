import { listarMensagensRapidas } from "./actions"
import { MensagensRapidasClient } from "./mensagens-rapidas-client"

export const metadata = { title: "Mensagens rápidas" }

export default async function MensagensRapidasPage() {
  const mensagens = await listarMensagensRapidas()

  return <MensagensRapidasClient mensagensIniciais={mensagens} />
}
