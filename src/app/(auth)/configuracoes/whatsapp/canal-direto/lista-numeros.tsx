"use client"

// Lista de números do workspace, cada um com o seu canal (B2-02).
//
// Os dados vêm do banco: a B2-01 desenhou esta tela com exemplos fixos, e esta
// issue trocou a origem. A criação da conexão é uma Server Action — o botão só
// captura a intenção.

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { criarConexaoCanalDireto } from "../actions"
import { CartaoNumero, type NumeroConectado } from "./cartao-numero"
import { EscolhaCanal, type CanalEscolhido } from "./escolha-canal"
import { PareamentoPorCodigo } from "./pareamento-por-codigo"
import { TelaQrCode, type Pareamento } from "./tela-qr-code"

/**
 * O código de pareamento ainda é fixo: pedi-lo ao gateway é a B2-03. A tela já
 * está pronta para receber o real — só a origem do dado muda.
 */
const PAREAMENTO_DE_EXEMPLO: Pareamento = {
  qr: "2@Kx9mQ4vB7nZ1pL8sT3wY6hJ0dF5gR2aC4eN7uM9iO1kP3xV5bW8zQ6yH4jS2lD0f",
  expires_at: new Date(Date.now() + 60_000).toISOString(),
}

export function ListaNumeros({ numeros }: { numeros: NumeroConectado[] }) {
  const [conectando, setConectando] = useState<CanalEscolhido | null>(null)
  const [pareamento, setPareamento] = useState(PAREAMENTO_DE_EXEMPLO)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, criar] = useTransition()

  function conectarPeloCanalDireto() {
    setErro(null)
    criar(async () => {
      const resultado = await criarConexaoCanalDireto()
      if (resultado.erro) {
        setErro(resultado.erro)
        return
      }
      setConectando("gateway")
    })
  }

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
          <Button onClick={() => setConectando("meta")} disabled={criando}>
            <Plus className="size-4" aria-hidden />
            Conectar número
          </Button>
        )}
      </div>

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
          {erro}
        </p>
      )}

      {conectando === null ? (
        numeros.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum número conectado ainda.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {numeros.map((numero) => (
              <CartaoNumero key={numero.id} numero={numero} />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <EscolhaCanal
              onEscolher={(canal) =>
                canal === "gateway" ? conectarPeloCanalDireto() : setConectando("meta")
              }
            />
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
