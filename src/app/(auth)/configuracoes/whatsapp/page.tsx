import { redirect } from "next/navigation"
import { sessaoAtual } from "@/lib/sessao"
import {
  lerPerfilComercialMeta,
  listarConexaoWhatsApp,
  listarConexoesWhatsApp,
  termoDoCanalDiretoAceito,
} from "./actions"
import { AcoesWhatsApp } from "./acoes-whatsapp"
import { PerfilComercial } from "./perfil-comercial"
import { WizardConexao } from "./wizard-conexao"
import { ListaNumeros } from "./canal-direto/lista-numeros"
import type { NumeroConectado } from "./canal-direto/cartao-numero"
import type { EstadoConexao } from "./canal-direto/estado-badge"
import { situacaoDaPausa } from "@/lib/whatsapp/gateway/pausa"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "WhatsApp" }

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

  if (perfil?.role !== "admin") redirect("/perfil?motivo=sem-permissao")

  // B2-02: a lista vem do banco, com todos os números do workspace e o canal de
  // cada um. `listarConexaoWhatsApp` continua sendo lida abaixo porque o fluxo
  // da Meta depende dela.
  const [conexao, conexoes, termoAceito] = await Promise.all([
    listarConexaoWhatsApp(),
    listarConexoesWhatsApp(),
    termoDoCanalDiretoAceito(),
  ])

  // Perfil comercial do número da Meta: só quando há um, e só se ele está ativo.
  const perfilMeta = conexao && conexao.status === "connected" ? await lerPerfilComercialMeta() : null

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
    <div className={CLASSE_DA_PAGINA}>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-6">WhatsApp</h1>

      <ListaNumeros
        numeros={numeros}
        termoAceito={termoAceito}
        fluxoMeta={conexao ? null : <WizardConexao />}
      />

      {/* O passo de conexão da Meta vive na escolha de canal, acima; aqui ficam
          só as ações do número da Meta que já existe. */}
      {conexao && (
        <div className="mt-10 border-t pt-8">
          <h2 className="text-base font-semibold mb-5">API Oficial da Meta</h2>
          {perfilMeta && (
            <div className="rounded-lg border p-6 max-w-2xl mb-6">
              <h3 className="text-sm font-semibold mb-4">Perfil comercial</h3>
              <PerfilComercial
                perfil={"perfil" in perfilMeta ? perfilMeta.perfil : null}
                nomeExibido={conexao.displayName || conexao.phoneNumber}
                erroCarregar={"erro" in perfilMeta ? perfilMeta.erro : undefined}
              />
            </div>
          )}
          <div className="rounded-lg border p-6 max-w-md">
            <AcoesWhatsApp conexaoId={conexao.id} status={conexao.status} />
          </div>
        </div>
      )}
    </div>
  )
}
