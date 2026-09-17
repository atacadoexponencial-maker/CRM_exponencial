"use client"

// Lista de números do workspace, cada um com o seu canal (B2-01, protótipo).
//
// **Dados fixos, menos o primeiro item.** O número da Meta vem da conexão real
// que a página já lia; os do canal direto são exemplos escritos aqui, para a
// forma ser aprovada antes de qualquer chamada ao gateway. Na B2-02 a lista
// inteira passa a vir do banco.

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartaoNumero, type NumeroConectado } from "./cartao-numero"
import { EscolhaCanal, type CanalEscolhido } from "./escolha-canal"
import { PareamentoPorCodigo } from "./pareamento-por-codigo"
import { TelaQrCode, type Pareamento } from "./tela-qr-code"

/** Exemplos do protótipo: um por estado que muda a tela. */
const EXEMPLOS: NumeroConectado[] = [
  {
    id: "exemplo-conectado",
    canal: "gateway",
    phone_number: "5511977776666",
    display_name: "Atacado Exemplo — Expansão",
    state: "connected",
    state_reason: null,
  },
  {
    id: "exemplo-aguardando",
    canal: "gateway",
    phone_number: null,
    display_name: null,
    state: "pairing",
    state_reason: null,
  },
  {
    id: "exemplo-desconectado",
    canal: "gateway",
    phone_number: "5511955554444",
    display_name: "Atacado Exemplo — Retenção",
    state: "disconnected",
    state_reason: "session_closed_on_device",
  },
  {
    id: "exemplo-banido",
    canal: "gateway",
    phone_number: "5511933332222",
    display_name: "Atacado Exemplo — Campanhas",
    state: "banned",
    state_reason: "banned_by_whatsapp",
  },
]

const PAREAMENTO_DE_EXEMPLO: Pareamento = {
  qr: "2@Kx9mQ4vB7nZ1pL8sT3wY6hJ0dF5gR2aC4eN7uM9iO1kP3xV5bW8zQ6yH4jS2lD0f",
  expires_at: new Date(Date.now() + 60_000).toISOString(),
}

export function ListaNumeros({ daMeta }: { daMeta: NumeroConectado | null }) {
  const [conectando, setConectando] = useState<CanalEscolhido | null>(null)
  const [pareamento, setPareamento] = useState(PAREAMENTO_DE_EXEMPLO)

  const numeros = [...(daMeta ? [daMeta] : []), ...EXEMPLOS]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Números conectados</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {numeros.length} {numeros.length === 1 ? "número" : "números"} neste workspace
          </p>
        </div>
        {!conectando && (
          <Button onClick={() => setConectando("gateway")}>
            <Plus className="size-4" aria-hidden />
            Conectar número
          </Button>
        )}
      </div>

      {conectando === null ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {numeros.map((numero) => (
            <CartaoNumero key={numero.id} numero={numero} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <EscolhaCanal onEscolher={setConectando} />
          </div>

          {conectando === "gateway" && (
            <>
              <TelaQrCode
                pareamento={pareamento}
                onRenovar={() =>
                  setPareamento({
                    qr: PAREAMENTO_DE_EXEMPLO.qr,
                    expires_at: new Date(Date.now() + 60_000).toISOString(),
                  })
                }
              />
              <PareamentoPorCodigo />
            </>
          )}

          {conectando === "meta" && (
            <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              A conexão pela API Oficial continua no fluxo atual, abaixo.
            </p>
          )}

          <Button variant="outline" onClick={() => setConectando(null)}>
            Voltar para a lista
          </Button>
        </div>
      )}
    </div>
  )
}
