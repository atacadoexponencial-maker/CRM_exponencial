"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CardMetrica } from "../../../dashboard/components/graficos"
import { criarReenvioParaFalhos, progressoDoDisparo } from "../../actions"
import type { ProgressoDoDisparo, RelatorioCampanha } from "../../actions"

const selectClass =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  // B8-02: aceita pelo gateway, esperando a vez de sair. Fora da janela de
  // envio a mensagem fica aqui — é espera, não falha.
  na_fila: "Na fila",
  enviado: "Enviado",
  entregue: "Entregue",
  lido: "Lido",
  falhou: "Falhou",
}

/** De quanto em quanto tempo o progresso se atualiza sozinho, em ms. */
const INTERVALO_DO_PROGRESSO = 10_000

const STATUS_CLASS: Record<string, string> = {
  pendente: "bg-secondary text-muted-foreground",
  na_fila: "bg-amber-500/10 text-amber-700",
  enviado: "bg-blue-500/10 text-blue-600",
  entregue: "bg-teal-500/10 text-teal-600",
  lido: "bg-green-500/10 text-green-600",
  falhou: "bg-red-500/10 text-red-600",
}

export function RelatorioCampanhaClient({ relatorio }: { relatorio: RelatorioCampanha }) {
  const router = useRouter()
  const [filtroStatus, setFiltroStatus] = useState("")
  const [criandoReenvio, setCriandoReenvio] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<ProgressoDoDisparo | null>(null)

  /**
   * B8-02: enquanto o disparo anda, a tela se atualiza sozinha.
   *
   * Pelo canal direto um disparo leva horas: obrigar a recarregar para saber se
   * andou é o que faz o cliente achar que travou. Quando não há mais nada a
   * despachar, o relógio para — tela aberta em campanha concluída não fica
   * consultando o banco à toa.
   */
  useEffect(() => {
    let ativo = true

    async function atualizar() {
      const atual = await progressoDoDisparo(relatorio.id)
      if (!ativo) return
      setProgresso(atual)
      return atual
    }

    void atualizar()
    const relogio = setInterval(async () => {
      const atual = await atualizar()
      if (atual && !atual.emAndamento) clearInterval(relogio)
    }, INTERVALO_DO_PROGRESSO)

    return () => {
      ativo = false
      clearInterval(relogio)
    }
  }, [relatorio.id])

  const filtrados = filtroStatus
    ? relatorio.destinatarios.filter((d) => d.status === filtroStatus)
    : relatorio.destinatarios

  const taxaEntrega = relatorio.enviados > 0 ? Math.round((relatorio.entregues / relatorio.enviados) * 100) : null
  const taxaLeitura = relatorio.enviados > 0 ? Math.round((relatorio.lidos / relatorio.enviados) * 100) : null

  async function handleReenvio() {
    setCriandoReenvio(true)
    setErro(null)
    const resultado = await criarReenvioParaFalhos(relatorio.id)
    setCriandoReenvio(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    router.push(`/campanhas/${resultado.id}`)
  }

  return (
    <>
      <Link
        href="/campanhas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="size-3.5" />
        Campanhas
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl font-semibold">{relatorio.nome}</h1>
        {relatorio.falhos > 0 && (
          <Button size="sm" variant="outline" onClick={handleReenvio} disabled={criandoReenvio}>
            <RotateCcw className="size-4 mr-1.5" />
            Reenviar para os que falharam ({relatorio.falhos})
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {relatorio.enviadaEm
          ? `Enviada em ${new Date(relatorio.enviadaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
          : relatorio.status === "cancelada"
            ? "Campanha cancelada"
            : "Envio em andamento"}{" "}
        · {relatorio.total} destinatários
      </p>

      {erro && <p className="text-sm text-destructive mb-4">{erro}</p>}

      {/* B8-02: progresso do disparo em andamento. */}
      {progresso?.emAndamento && (
        <div className="rounded-lg border p-4 mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
            <h2 className="text-sm font-semibold">Disparo em andamento</h2>
            <p className="text-xs text-muted-foreground">
              {progresso.enviados} de {progresso.total} já saíram
            </p>
          </div>

          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={progresso.total}
            aria-valuenow={progresso.enviados}
          >
            <div
              className="h-full bg-primary transition-[width]"
              style={{
                width: `${progresso.total > 0 ? (progresso.enviados / progresso.total) * 100 : 0}%`,
              }}
            />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {progresso.naFila > 0 && (
              <>
                <strong className="text-foreground">{progresso.naFila}</strong> esperando a vez de
                sair pelo número — o envio respeita o ritmo configurado e pausa fora do horário
                permitido.{" "}
              </>
            )}
            {progresso.pendentes > 0 && <>{progresso.pendentes} ainda não foram despachadas. </>}
            {progresso.falhos > 0 && <>{progresso.falhos} falharam.</>}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <CardMetrica titulo="Total enviado" valor={relatorio.enviados} />
        <CardMetrica titulo="Entregues" valor={relatorio.entregues} />
        <CardMetrica titulo="Lidos" valor={relatorio.lidos} />
        <CardMetrica titulo="Falhos" valor={relatorio.falhos} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <CardMetrica titulo="Taxa de entrega" valor={taxaEntrega} sufixo="%" />
        <CardMetrica titulo="Taxa de leitura" valor={taxaLeitura} sufixo="%" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Destinatários ({filtrados.length})</h2>
        <select
          aria-label="Filtrar por status de entrega"
          className={selectClass}
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Contato</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Número</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  Nenhum destinatário com este status
                </td>
              </tr>
            )}
            {filtrados.map((d, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 font-medium">{d.nome}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{d.telefone}</td>
                <td className="px-4 py-2.5">
                  <span className={cn("text-xs rounded-full px-2 py-0.5 font-medium", STATUS_CLASS[d.status])}>
                    {STATUS_LABEL[d.status] ?? d.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {d.atualizadoEm
                    ? new Date(d.atualizadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
