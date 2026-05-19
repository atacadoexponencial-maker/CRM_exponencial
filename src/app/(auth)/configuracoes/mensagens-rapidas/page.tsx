import { listarMensagensRapidas } from "./actions"
import { MensagensRapidasClient } from "./mensagens-rapidas-client"

export default async function MensagensRapidasPage() {
  const mensagens = await listarMensagensRapidas()

  return <MensagensRapidasClient mensagensIniciais={mensagens} />
}
