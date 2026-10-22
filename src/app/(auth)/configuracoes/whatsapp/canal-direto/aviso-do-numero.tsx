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
    classe: "border-aviso/30 bg-aviso-fundo text-aviso",
    icone: Clock,
  },
  voltou: {
    classe: "border-sucesso/30 bg-sucesso-fundo text-sucesso",
    icone: CheckCircle2,
  },
  tentando_voltar: {
    classe: "bg-muted/40 text-foreground",
    icone: RefreshCw,
  },
  sessao_acabou: {
    classe: "border-erro/30 bg-erro-fundo text-erro",
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
