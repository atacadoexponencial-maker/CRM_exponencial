// Aviso dentro do cartão de um número do canal direto (B9-01).
//
// Só visual: recebe o texto pronto e a variante. Quem decide qual aviso
// aparecer é o servidor (B9-02 e B9-03); o protótipo usa dados fixos.
//
// O tema do projeto é sempre escuro, por isso as cores não têm variante `dark:`.

import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react"

export type VarianteDoAviso = "pausa_longa" | "voltou" | "tentando_voltar" | "sessao_acabou"

const ESTILO: Record<VarianteDoAviso, { classe: string; icone: typeof Clock }> = {
  pausa_longa: {
    classe: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    icone: Clock,
  },
  voltou: {
    classe: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    icone: CheckCircle2,
  },
  tentando_voltar: {
    classe: "bg-muted/40 text-foreground",
    icone: RefreshCw,
  },
  sessao_acabou: {
    classe: "border-red-500/30 bg-red-500/10 text-red-200",
    icone: AlertTriangle,
  },
}

export function AvisoDoNumero({
  variante,
  children,
  acao,
}: {
  variante: VarianteDoAviso
  children: React.ReactNode
  /** Botão abaixo do texto, quando o aviso tem uma saída (ex.: ler QR novo). */
  acao?: React.ReactNode
}) {
  const { classe, icone: Icone } = ESTILO[variante]

  return (
    <div role="status" className={`rounded-lg border p-3 text-sm ${classe}`}>
      <p className="flex gap-2">
        <Icone className="size-4 shrink-0 mt-0.5" aria-hidden />
        <span>{children}</span>
      </p>
      {acao && <div className="mt-3 pl-6">{acao}</div>}
    </div>
  )
}
