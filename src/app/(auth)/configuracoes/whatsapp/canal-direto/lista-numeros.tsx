"use client"

// Lista de números do workspace, cada um com o seu canal (B2-02).
//
// Os dados vêm do banco: a B2-01 desenhou esta tela com exemplos fixos, e esta
// issue trocou a origem. A criação da conexão é uma Server Action — o botão só
// captura a intenção.
//
// B9-02: Reconectar pede a volta com a sessão guardada, sem QR. A lista conduz
// a reconexão de um número por vez: mostra "Reconectando…", sonda o estado,
// anuncia a volta ou explica a falha — e só então, se a sessão acabou, abre o
// QR Code da mesma instância.

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Activity, CheckCircle2, Gauge, Plus, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  criarConexaoCanalDireto,
  pedirQrCodeCanalDireto,
  reconectarNumeroCanalDireto,
  sincronizarEstadoCanalDireto,
  sincronizarEstadoDoNumero,
} from "../actions"
import { AcoesCanalDireto } from "./acoes-canal-direto"
import { AvisoDoNumero } from "./aviso-do-numero"
import { CartaoNumero, type NumeroConectado } from "./cartao-numero"
import { EscolhaCanal, type CanalEscolhido } from "./escolha-canal"
import { PareamentoPorCodigo } from "./pareamento-por-codigo"
import { TelaQrCode, type Pareamento } from "./tela-qr-code"
import type { EstadoConexao, MotivoDeTransicao } from "./estado-badge"
import { pareamentoEmAndamento } from "@/lib/whatsapp/gateway/estado"
import { TEXTO_DE_QUEDA, textoDePausaLonga } from "@/lib/whatsapp/gateway/pausa"
import { TermoResponsabilidade } from "./termo-responsabilidade"

/** Enquanto o pareamento não termina, a tela pergunta de novo a cada 3s. */
const INTERVALO_DE_ACOMPANHAMENTO_MS = 3000
/** B9-02: depois de 20 sondagens (1 min) sem desfecho, a tela desiste de esperar. */
const MAXIMO_DE_SONDAGENS = 20

/** B9-02: reconexão em curso, ou o seu desfecho, de um número. */
type Reconexao = {
  id: string
  fase: "reconectando" | "voltou" | "falhou"
  erro?: string
  precisaQr?: boolean
}

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
  // O servidor leva uns 2s para criar o número, e o botão desativado só vale
  // depois do próximo render: a trava síncrona impede o segundo pedido.
  const criacaoEmCurso = useRef(false)
  const [renovando, renovar] = useTransition()
  const [estado, setEstado] = useState<EstadoConexao>("pairing")
  const [motivo, setMotivo] = useState<MotivoDeTransicao | undefined>()
  const [termoAberto, setTermoAberto] = useState(false)
  const [aceito, setAceito] = useState(termoAceito)
  const [recemConectado, setRecemConectado] = useState(false)
  // Reconexão de um número que já existe: a escolha de canal fica escondida,
  // porque o "Continuar" dela criaria um número novo (24/09/2026).
  const [reconectando, setReconectando] = useState(false)
  // B9-02: instância cujo QR e estado a tela acompanha. Nula, vale a mais recente.
  const [conexaoAlvo, setConexaoAlvo] = useState<string | null>(null)
  const [reconexao, setReconexao] = useState<Reconexao | null>(null)
  const sondagens = useRef(0)
  const router = useRouter()

  function conectarPeloCanalDireto() {
    setErro(null)
    setRecemConectado(false)

    // B3-01: sem aceite, o termo vem primeiro. A action recusa de todo jeito —
    // isto evita a viagem inútil e explica o motivo na hora.
    if (!aceito) {
      setTermoAberto(true)
      return
    }

    if (criacaoEmCurso.current) return
    criacaoEmCurso.current = true

    criar(async () => {
      try {
        const resultado = await criarConexaoCanalDireto()
        if (resultado.erro) {
          setErro(resultado.erro)
          return
        }
        setConectando("gateway")
        // B2-03: com a instância criada, o código já pode ser pedido.
        await buscarQr()
      } finally {
        criacaoEmCurso.current = false
      }
    })
  }

  /**
   * B2-04: acompanha o estado enquanto a tela de pareamento está aberta. Para
   * sozinho quando o pareamento termina — conectado, banido ou desconectado.
   */
  const acompanhar = useCallback(async () => {
    const resultado = await sincronizarEstadoCanalDireto(conexaoAlvo ?? undefined)
    if (resultado.erro || !resultado.estado) return
    const novo = resultado.estado.state as EstadoConexao

    // Conectou: a tela do código sai, e a lista recarregada mostra o número.
    // Só o selo mudando parecia tela travada. O estado volta ao inicial para o
    // próximo pareamento ser acompanhado desde o começo.
    if (novo === "connected") {
      setConectando(null)
      setReconectando(false)
      setConexaoAlvo(null)
      setPareamento(null)
      setEstado("pairing")
      setRecemConectado(true)
      router.refresh()
      return
    }

    setEstado(novo)
  }, [router, conexaoAlvo])

  useEffect(() => {
    if (conectando !== "gateway") return
    if (!pareamentoEmAndamento(estado)) return

    const relogio = setInterval(() => void acompanhar(), INTERVALO_DE_ACOMPANHAMENTO_MS)
    return () => clearInterval(relogio)
  }, [conectando, estado, acompanhar])

  async function buscarQr(conexaoId?: string) {
    setErroPareamento(null)
    const resultado = await pedirQrCodeCanalDireto(conexaoId)
    if (resultado.erro) {
      setErroPareamento(resultado.erro)
      setPareamento(null)
      return
    }
    setPareamento(resultado.qr ?? null)
  }

  // ── B9-02: reconectar com a sessão guardada ──────────────────────────────

  async function reconectar(conexaoId: string) {
    if (reconexao?.fase === "reconectando") return
    setRecemConectado(false)
    sondagens.current = 0
    setReconexao({ id: conexaoId, fase: "reconectando" })

    const resultado = await reconectarNumeroCanalDireto(conexaoId)
    if (resultado.erro) {
      setReconexao({ id: conexaoId, fase: "falhou", erro: resultado.erro, precisaQr: resultado.precisaQr })
      return
    }
    // `connected` de imediato acontece quando o gateway já estava conectado.
    if (resultado.estado === "connected") {
      setReconexao({ id: conexaoId, fase: "voltou" })
      router.refresh()
    }
  }

  /** Sonda o número em reconexão até `connected`, `disconnected` ou o limite. */
  useEffect(() => {
    if (reconexao?.fase !== "reconectando") return
    const id = reconexao.id

    const relogio = setInterval(async () => {
      sondagens.current += 1
      const resultado = await sincronizarEstadoDoNumero(id)

      if (resultado.estado === "connected") {
        setReconexao({ id, fase: "voltou" })
        router.refresh()
        return
      }
      if (resultado.estado === "disconnected") {
        setReconexao({
          id,
          fase: "falhou",
          erro: resultado.precisaQr
            ? "Não foi possível reconectar: a sessão foi encerrada no aparelho. Para voltar, leia um QR Code novo — o número continua o mesmo."
            : (resultado.motivo ?? "Não foi possível reconectar. Tente de novo."),
          precisaQr: resultado.precisaQr,
        })
        return
      }
      if (resultado.erro && sondagens.current >= 3) {
        setReconexao({ id, fase: "falhou", erro: resultado.erro })
        return
      }
      if (sondagens.current >= MAXIMO_DE_SONDAGENS) {
        setReconexao({ id, fase: "falhou", erro: "O gateway não confirmou a reconexão. Tente de novo." })
      }
    }, INTERVALO_DE_ACOMPANHAMENTO_MS)

    return () => clearInterval(relogio)
  }, [reconexao, router])

  /** Sessão acabou: QR novo para a mesma instância, sem criar número. */
  function lerQrDoMesmoNumero(conexaoId: string) {
    setReconexao(null)
    setReconectando(true)
    setConexaoAlvo(conexaoId)
    setEstado("pairing")
    setConectando("gateway")
    void buscarQr(conexaoId)
  }

  function avisoDoNumero(numero: NumeroConectado): React.ReactNode {
    if (!reconexao || reconexao.id !== numero.id) return avisoDePausa(numero)
    if (reconexao.fase === "voltou" && numero.state === "connected") {
      return (
        <AvisoDoNumero variante="voltou">
          Número reconectado. Ele já pode receber e enviar mensagens.
        </AvisoDoNumero>
      )
    }
    if (reconexao.fase === "falhou") {
      return (
        <AvisoDoNumero
          variante="sessao_acabou"
          acao={
            reconexao.precisaQr ? (
              <Button size="sm" onClick={() => lerQrDoMesmoNumero(numero.id)}>
                <QrCode className="size-3.5" aria-hidden />
                Ler QR Code novo
              </Button>
            ) : undefined
          }
        >
          {reconexao.erro}
        </AvisoDoNumero>
      )
    }
    return avisoDePausa(numero)
  }

  /** B9-03: pausa longa e queda, decididas no servidor; a tela só desenha. */
  function avisoDePausa(numero: NumeroConectado): React.ReactNode {
    if (numero.pausa?.pausaLonga) {
      return <AvisoDoNumero variante="pausa_longa">{textoDePausaLonga(numero.pausa.dias)}</AvisoDoNumero>
    }
    if (numero.pausa?.tipo === "queda") {
      return <AvisoDoNumero variante="tentando_voltar">{TEXTO_DE_QUEDA}</AvisoDoNumero>
    }
    return undefined
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

      {recemConectado && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 p-3 text-sm"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          Número conectado. Ele já pode receber e enviar mensagens.
        </p>
      )}

      {erro && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 p-3 text-sm ">
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
            {numeros.map((numero) => {
              const emReconexao = reconexao?.id === numero.id && reconexao.fase === "reconectando"
              return (
                <CartaoNumero
                  key={numero.id}
                  // Enquanto reconecta, o selo diz "Conectando" mesmo antes de a
                  // lista recarregar: é o que está acontecendo.
                  numero={emReconexao ? { ...numero, state: "connecting", state_reason: null } : numero}
                  aviso={avisoDoNumero(numero)}
                  desdeQuando={emReconexao ? undefined : numero.pausa?.desdeQuando ?? undefined}
                  /* B2-05 e B4/B5: o canal direto tem ciclo de vida, saúde e
                     ritmo; a Meta não expõe nenhum dos três e mantém as ações
                     dela no fluxo próprio, mais abaixo na página. */
                  acoes={
                    numero.canal === "gateway" ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-3 text-sm">
                          <Link
                            href={`/configuracoes/whatsapp/${numero.id}/saude`}
                            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Activity className="size-3.5" aria-hidden />
                            Saúde
                          </Link>
                          <Link
                            href={`/configuracoes/whatsapp/${numero.id}/ritmo`}
                            className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Gauge className="size-3.5" aria-hidden />
                            Ritmo
                          </Link>
                        </div>
                        <AcoesCanalDireto
                          conexaoId={numero.id}
                          estado={numero.state}
                          reconectando={emReconexao}
                          onReconectar={() => void reconectar(numero.id)}
                        />
                      </div>
                    ) : undefined
                  }
                />
              )
            })}
          </div>
        )
      ) : (
        <div className="space-y-6">
          {!reconectando && (
            <div className="rounded-lg border p-6">
              <EscolhaCanal
                ocupado={criando}
                onEscolher={(canal) =>
                  canal === "gateway" ? conectarPeloCanalDireto() : setConectando("meta")
                }
              />
            </div>
          )}

          {conectando === "gateway" && (
            <>
              <TelaQrCode
                pareamento={pareamento}
                estado={estado}
                motivo={motivo}
                erro={erroPareamento}
                renovando={renovando}
                onRenovar={() => renovar(() => buscarQr(conexaoAlvo ?? undefined))}
              />
              <PareamentoPorCodigo />
            </>
          )}

          {conectando === "meta" && (
            <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              A conexão pela API Oficial continua no fluxo atual, abaixo.
            </p>
          )}

          <Button
            variant="outline"
            onClick={() => {
              setConectando(null)
              setReconectando(false)
              setConexaoAlvo(null)
            }}
          >
            Voltar para a lista
          </Button>
        </div>
      )}
    </div>
  )
}
