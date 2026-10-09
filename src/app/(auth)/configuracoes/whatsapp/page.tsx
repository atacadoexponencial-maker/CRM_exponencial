import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import {
  listarConexaoWhatsApp,
  listarConexoesWhatsApp,
  termoDoCanalDiretoAceito,
} from "./actions"
import { AcoesWhatsApp } from "./acoes-whatsapp"
import { WizardConexao } from "./wizard-conexao"
import { numeroTesteHabilitado } from "./numero-teste"
import { ListaNumeros } from "./canal-direto/lista-numeros"
import type { NumeroConectado } from "./canal-direto/cartao-numero"
import type { EstadoConexao } from "./canal-direto/estado-badge"
import { situacaoDaPausa } from "@/lib/whatsapp/gateway/pausa"

/**
 * Estados que o contrato do gateway prevê. A coluna `status` é texto livre e
 * guarda `connected` para as conexões da Meta; o que não for reconhecido é
 * tratado como desconectado — nunca como conectado.
 */
const ESTADOS: EstadoConexao[] = [
  "pairing",
  "connecting",
  "connected",
  "disconnected",
  "banned",
  "removed",
]

export default async function WhatsAppPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  if (perfil?.role !== "admin") redirect("/perfil")

  // B2-02: a lista vem do banco, com todos os números do workspace e o canal de
  // cada um. `listarConexaoWhatsApp` continua sendo lida abaixo porque o fluxo
  // da Meta depende dela.
  const [conexao, conexoes, termoAceito] = await Promise.all([
    listarConexaoWhatsApp(),
    listarConexoesWhatsApp(),
    termoDoCanalDiretoAceito(),
  ])

  const numeros: NumeroConectado[] = conexoes.map((c) => ({
    id: c.id,
    canal: c.canal,
    phone_number: c.phoneNumber,
    display_name: c.displayName,
    state: ESTADOS.includes(c.status as EstadoConexao)
      ? (c.status as EstadoConexao)
      : "disconnected",
    state_reason: (c.stateReason as NumeroConectado["state_reason"]) ?? null,
    // B9-03: "Desconectado há N dias", pausa longa e queda, decididos aqui.
    pausa: situacaoDaPausa({ status: c.status, stateReason: c.stateReason ?? null, disconnectedAt: c.disconnectedAt }),
  }))

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold mb-6">WhatsApp</h1>

      <ListaNumeros
        numeros={numeros}
        termoAceito={termoAceito}
        fluxoMeta={conexao ? null : <WizardConexao mostrarNumeroTeste={numeroTesteHabilitado()} />}
      />

      {/* O passo de conexão da Meta vive na escolha de canal, acima; aqui ficam
          só as ações do número da Meta que já existe. */}
      {conexao && (
        <div className="mt-10 border-t pt-8">
          <h2 className="text-base font-semibold mb-5">API Oficial da Meta</h2>
          <div className="rounded-lg border p-6 max-w-md">
            <AcoesWhatsApp conexaoId={conexao.id} status={conexao.status} />
          </div>
        </div>
      )}
    </div>
  )
}
