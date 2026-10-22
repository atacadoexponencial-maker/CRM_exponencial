"use client"

// B34-03: aba Funil de clientes — funil "1+ a 7+ compras", legenda com parados, taxas de
// conversão, tabela por etapa, "o que são clientes parados?" e dicas.

import { useEffect, useState, useTransition } from "react"
import { Funnel, FunnelChart, LabelList, Tooltip } from "recharts"
import { Info, Loader2 } from "lucide-react"
import { Balao } from "@/app/(auth)/dashboard/components/graficos"
import { DIAS_PARADO, type EtapaDoFunil, type ResultadoFunilClientes } from "@/lib/relatorios/funil-clientes"
import { buscarFunilClientes } from "../actions"

const moeda = (v: number | null) => (v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`)

const DICAS = [
  "Segmente campanhas para clientes que não avançaram de etapa;",
  "Ofereça promoções especiais para incentivar a próxima compra;",
  "Personalize a comunicação com base no histórico de compras;",
  "Envie lembretes e mensagens amigáveis;",
  "Acompanhe o retorno e melhore o atendimento.",
]

export function FunilDeClientes({ resultado }: { resultado: ResultadoFunilClientes }) {
  const [explicar, setExplicar] = useState(false)
  const dados = resultado.etapas
    .filter((e) => e.clientes > 0)
    .map((e) => ({ ...e, name: e.rotulo, value: e.clientes, fill: e.cor, texto: `${e.rotulo}: ${e.clientes}${e.conversao !== null ? ` · ${pct(e.conversao)}` : ""}` }))

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold">Funil de clientes</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Quantos clientes já fizeram pelo menos N compras, em toda a história</p>
          </div>
          <button type="button" onClick={() => setExplicar((v) => !v)} aria-expanded={explicar} className="inline-flex items-center gap-1.5 text-xs text-info hover:underline">
            <Info className="size-3.5" /> O que são clientes parados?
          </button>
        </div>
        {explicar && (
          <p className="text-xs text-muted-foreground rounded-md bg-muted/40 p-3 mb-3" data-testid="explicacao-parados">
            Cliente parado é o que está em uma etapa do funil mas não compra há mais de {DIAS_PARADO} dias. Quanto mais parados numa etapa, mais clientes para reativar antes que avancem para a próxima compra.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr] items-center">
          {dados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente com compra.</p>
          ) : (
            <FunnelChart width={600} height={320} responsive style={{ width: "100%", maxWidth: "100%" }}>
              <Tooltip
                content={({ active, payload }) => {
                  const e = payload?.[0]?.payload as EtapaDoFunil | undefined
                  if (!active || !e) return null
                  return <Balao linhas={[{ rotulo: e.rotulo, valor: String(e.clientes) }, { rotulo: "Conversão da etapa anterior", valor: pct(e.conversao) }, { rotulo: "Ticket médio", valor: moeda(e.ticketMedio) }, { rotulo: "Parados", valor: String(e.parados) }]} />
                }}
              />
              <Funnel dataKey="value" data={dados} isAnimationActive={false}>
                <LabelList dataKey="texto" position="center" fill="#fff" fontSize={12} stroke="none" />
              </Funnel>
            </FunnelChart>
          )}
          <ul className="flex flex-col gap-2 text-sm" data-testid="legenda-funil">
            {resultado.etapas.map((e) => (
              <li key={e.n} className="flex items-center gap-2">
                <span className="h-3 w-5 rounded-sm shrink-0" style={{ backgroundColor: e.cor }} />
                <span className="tabular-nums">{e.rotulo}: <strong>{e.clientes}</strong> <span className="text-muted-foreground">· parados: {e.parados}</span></span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold mb-3">Taxas de conversão</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="taxas-conversao">
          {resultado.taxas.map((t) => (
            <div key={t.de} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{t.de}ª → {t.para}ª</p>
              <p className="text-lg font-semibold tabular-nums">{pct(t.percentual)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold mb-3">Por etapa</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="tabela-funil">
            <thead>
              <tr className="text-xs text-muted-foreground border-b text-left">
                <th className="py-2 pr-3 font-medium">Etapa</th>
                <th className="py-2 pr-3 font-medium text-right">Clientes</th>
                <th className="py-2 pr-3 font-medium text-right">Conversão</th>
                <th className="py-2 pr-3 font-medium text-right">Ticket médio</th>
                <th className="py-2 font-medium text-right">Parados</th>
              </tr>
            </thead>
            <tbody>
              {resultado.etapas.map((e) => (
                <tr key={e.n} className="border-b last:border-0" data-testid={`etapa-${e.n}`}>
                  <td className="py-2 pr-3"><span className="inline-block h-2.5 w-2.5 rounded-sm mr-2 align-middle" style={{ backgroundColor: e.cor }} />{e.rotulo}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{e.clientes}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{pct(e.conversao)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{moeda(e.ticketMedio)}</td>
                  <td className="py-2 text-right tabular-nums">{e.parados}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-semibold mb-2">Como melhorar suas taxas de conversão</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground flex flex-col gap-1">
          {DICAS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export function FunilClientesClient({ atendenteId, inicial = null }: { atendenteId: string | null; inicial?: ResultadoFunilClientes | null }) {
  const [resultado, setResultado] = useState<ResultadoFunilClientes | null>(inicial)
  const [erro, setErro] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (inicial) return
    startTransition(async () => {
      try {
        const r = await buscarFunilClientes({ atendenteId })
        if (r) {
          setResultado(r)
          setErro(false)
        } else setErro(true)
      } catch {
        setErro(true)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atendenteId])

  if (erro) return <p className="text-sm text-destructive">Não foi possível carregar o funil. Tente novamente.</p>
  if (!resultado) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Calculando o funil…</p>
  return (
    <>
      {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground mb-2" />}
      <FunilDeClientes resultado={resultado} />
    </>
  )
}
