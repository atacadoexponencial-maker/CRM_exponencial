"use client"

// Lista de números do workspace, cada um com o seu canal (B2-02).
//
// Os dados vêm do banco: a B2-01 desenhou esta tela com exemplos fixos, e esta
// issue trocou a origem. A criação da conexão é uma Server Action — o botão só
// captura a intenção.

import { useCallback, useEffect, useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  criarConexaoCanalDireto,
  pedirQrCodeCanalDireto,
  sincronizarEstadoCanalDireto,
} from "../actions"
import { CartaoNumero, type NumeroConectado } from "./cartao-numero"
import { EscolhaCanal, type CanalEscolhido } from "./escolha-canal"
import { PareamentoPorCodigo } from "./pareamento-por-codigo"
import { TelaQrCode, type Pareamento } from "./tela-qr-code"
import type { EstadoConexao, MotivoDeTransicao } from "./estado-badge"
import { pareamentoEmAndamento } from "@/lib/whatsapp/gateway/estado"

/** Enquanto o pareamento não termina, a tela pergunta de novo a cada 3s. */
const INTERVALO_DE_ACOMPANHAMENTO_MS = 3000
import { TermoResponsabilidade } from "./termo-responsabilidade"

export function ListaNumeros({
  numeros,
  termoAceito,
}: {
  numeros: NumeroConectado[]
  /** B3-01: aceite da versão vigente do termo, lido no servidor. */
  termoAceito: boolean
}) {
  const [conectando, setConectando] = useState<CanalEscolhido | null>(null)
  const [pareamento, setPareamento] = useState<Pareamento | null>(null)
  const [erroPareamento, setErroPareamento] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, criar] = useTransition()
  const [renovando, renovar] = useTransition()
  const [estado, setEstado] = useState<EstadoConexao>("pairing")
  const [motivo, setMotivo] = useState<MotivoDeTransicao | undefined>()
  const [termoAberto, setTermoAberto] = useState(false)
  const [aceito, setAceito] = useState(termoAceito)

  function conectarPeloCanalDireto() {
    setErro(null)

    // B3-01: sem aceite, o termo vem primeiro. A action recusa de todo jeito —
    // isto evita a viagem inútil e explica o motivo na hora.
    if (!aceito) {
      setTermoAberto(true)
      return
    }

    criar(async () => {
      const resultado = await criarConexaoCanalDireto()
      if (resultado.erro) {
        setErro(resultado.erro)
        return
      }
      setConectando("gateway")
      // B2-03: com a instância criada, o código já pode ser pedido.
      await buscarQr()
    })
  }

  /**
   * B2-04: acompanha o estado enquanto a tela de pareamento está aberta. Para
   * sozinho quando o pareamento termina — conectado, banido ou desconectado.
   */
  const acompanhar = useCallback(async () => {
    const resultado = await sincronizarEstadoCanalDireto()
    if (resultado.erro || !resultado.estado) return
    setEstado(resultado.estado.state as EstadoConexao)
  }, [])

  useEffect(() => {
    if (conectando !== "gateway") return
    if (!pareamentoEmAndamento(estado)) return

    const relogio = setInterval(() => void acompanhar(), INTERVALO_DE_ACOMPANHAMENTO_MS)
    return () => clearInterval(relogio)
  }, [conectando, estado, acompanhar])

  async function buscarQr() {
    setErroPareamento(null)
    const resultado = await pedirQrCodeCanalDireto()
    if (resultado.erro) {
      setErroPareamento(resultado.erro)
      setPareamento(null)
      return
    }
    setPareamento(resultado.qr ?? null)
  }

  return (
    <div className="space-y-6">
      <TermoResponsabilidade
        aberto={termoAberto}
        onAbertoChange={setTermoAberto}
        onAceito={() => {
          setAceito(true)
          conectarPeloCanalDireto()
        }}
      />

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
                estado={estado}
                motivo={motivo}
                erro={erroPareamento}
                renovando={renovando}
                onRenovar={() => renovar(buscarQr)}
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
