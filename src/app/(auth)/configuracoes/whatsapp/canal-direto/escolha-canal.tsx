"use client"

// Escolha de canal antes de conectar um número (B2-01, protótipo).
//
// A explicação de cada canal não é enfeite: o canal direto opera fora dos
// Termos do WhatsApp e o número pode ser banido. Quem escolhe precisa ler isso
// antes, não depois.

import { useState } from "react"
import { BadgeCheck, QrCode, ShieldAlert, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export type CanalEscolhido = "meta" | "gateway"

const CANAIS = [
  {
    valor: "meta" as const,
    titulo: "API Oficial da Meta",
    icone: BadgeCheck,
    tempo: "De dias a semanas",
    resumo:
      "O caminho aprovado pela Meta. Exige conta comercial verificada, aprovação do número e templates aprovados para iniciar conversa.",
    pontos: [
      "Sem risco de banimento por uso da ferramenta",
      "Mensagem ativa só por template aprovado",
      "Cobrança por conversa, pela Meta",
    ],
  },
  {
    valor: "gateway" as const,
    titulo: "Canal direto (QR Code)",
    icone: QrCode,
    tempo: "Minutos",
    resumo:
      "Conecta o número lendo um QR Code, como o WhatsApp Web. Não passa pela Meta, e por isso opera fora dos Termos de Serviço do WhatsApp.",
    pontos: [
      "Conecta na hora, sem aprovação",
      "Sem template: qualquer texto pode ser enviado",
      "Risco de banimento do número é do cliente",
    ],
  },
]

export function EscolhaCanal({
  onEscolher,
}: {
  onEscolher?: (canal: CanalEscolhido) => void
}) {
  const [selecionado, setSelecionado] = useState<CanalEscolhido | null>(null)

  return (
    <div>
      <h2 className="text-base font-semibold mb-1">Conectar um número</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Escolha por onde este número vai enviar e receber. Cada número do workspace pode usar um
        canal diferente.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {CANAIS.map((canal) => {
          const Icone = canal.icone
          const ativo = selecionado === canal.valor

          return (
            <button
              key={canal.valor}
              type="button"
              onClick={() => setSelecionado(canal.valor)}
              aria-pressed={ativo}
              className={`text-left rounded-lg border p-5 transition-colors ${
                ativo ? "border-foreground ring-1 ring-foreground" : "hover:border-foreground/40"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icone className="size-4 shrink-0" aria-hidden />
                <span className="font-medium">{canal.titulo}</span>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Clock className="size-3.5 shrink-0" aria-hidden />
                {canal.tempo} para conectar
              </p>

              <p className="text-sm text-muted-foreground mb-3">{canal.resumo}</p>

              <ul className="space-y-1 text-sm">
                {canal.pontos.map((ponto) => (
                  <li key={ponto} className="flex gap-2">
                    <span aria-hidden className="text-muted-foreground">
                      •
                    </span>
                    {ponto}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      {selecionado === "gateway" && (
        <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-100 p-4 text-sm ">
          <ShieldAlert className="size-4 shrink-0 mt-0.5 text-amber-300" aria-hidden />
          <p>
            O canal direto opera fora dos Termos de Serviço do WhatsApp. O número pode ser
            bloqueado, e a responsabilidade por ele é sua. Ao continuar, o termo de
            responsabilidade é exibido para leitura e aceite — sem ele, o CRM não conecta.
          </p>
        </div>
      )}

      <div className="mt-5">
        <Button disabled={!selecionado} onClick={() => selecionado && onEscolher?.(selecionado)}>
          Continuar
        </Button>
      </div>
    </div>
  )
}
