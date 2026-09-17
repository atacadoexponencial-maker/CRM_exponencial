"use client"

// Tela de saúde de um número (B4-02: dados reais; B4-04: retomada do freio).
//
// A B4-01 desenhou isto com três estados fixos. Agora a saúde vem do gateway,
// lida no servidor quando a página abre — sem tempo real e sem cache, como a
// issue pede.
//
// Leitura que falhou **não** vira zero na tela: a página mostra o motivo, e os
// medidores não aparecem. Zero envios e "não consegui ler" são coisas
// diferentes.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { AvisoDeFreio } from "./aviso-de-freio"
import { CartaoSaude } from "./cartao-saude"
import { IndicadorAquecimento } from "./indicador-aquecimento"
import { MedidorConsumo } from "./medidor-consumo"
import { SinalDeRisco } from "./sinal-de-risco"
import { retomarEnviosDoNumero } from "./actions"
import type { SaudeDoNumero } from "./tipos"

export function SaudeClient({
  connectionId,
  saude,
  podeRetomar,
}: {
  connectionId: string
  saude: SaudeDoNumero
  /** Admin retoma; Gerente só acompanha. A regra que vale é a da action. */
  podeRetomar: boolean
}) {
  const router = useRouter()
  const [erroRetomada, setErroRetomada] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [retomando, retomar] = useTransition()

  function confirmarRetomada() {
    setErroRetomada(null)
    retomar(async () => {
      const resultado = await retomarEnviosDoNumero(connectionId)
      if (resultado.erro) {
        setConfirmando(false)
        setErroRetomada(resultado.erro)
        return
      }
      setConfirmando(false)
      // A saúde é lida no servidor: recarregar é o que mostra o número liberado.
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <AvisoDeFreio
        freio={saude.freio}
        podeRetomar={podeRetomar}
        onRetomar={() => setConfirmando(true)}
        retomando={retomando}
        erro={erroRetomada}
      />

      {/* B4-04: retomar um número freado por falhas é assumir risco, e a
          confirmação existe para o clique não ser reflexo. */}
      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogPopup>
          <DialogTitle>Retomar os envios deste número?</DialogTitle>
          <p className="text-sm text-muted-foreground mt-3">
            Os envios foram interrompidos porque muitos falharam seguidamente. Retomar volta a
            enviar as {saude.freio.mensagensParadas.toLocaleString("pt-BR")} mensagens paradas —
            se a causa das falhas continuar, o número fica mais perto de ser bloqueado pelo
            WhatsApp.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <DialogClose
              render={
                <Button variant="outline" disabled={retomando}>
                  Cancelar
                </Button>
              }
            />
            <Button onClick={confirmarRetomada} disabled={retomando}>
              {retomando ? "Retomando…" : "Retomar envios"}
            </Button>
          </div>
        </DialogPopup>
      </Dialog>

      <CartaoSaude saude={saude} />

      <div className="rounded-lg border p-5">
        <h2 className="text-sm font-medium mb-4">Consumo dos tetos vigentes</h2>
        <div className="space-y-5">
          <MedidorConsumo
            rotulo="Nesta hora"
            usado={saude.enviadasNaHora}
            teto={saude.tetoHora}
            observacao="Janela móvel de 60 minutos, não a hora cheia."
          />
          <MedidorConsumo
            rotulo="Nas últimas 24 horas"
            usado={saude.enviadasNoDia}
            teto={saude.tetoDia}
            observacao="Janela móvel de 24 horas, não o dia do calendário."
          />
        </div>
      </div>

      <SinalDeRisco risco={saude.risco} />

      <IndicadorAquecimento aquecimento={saude.aquecimento} />
    </div>
  )
}
