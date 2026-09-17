"use client"

// Protótipo da tela de ritmo (B5-01): dois estados fixos, número novo e número
// maduro, trocáveis na própria tela.
//
// Os limites que aparecem ao lado dos campos **vivem no gateway**
// (`INTERVALO_MINIMO_S`, `TETO_HORA_MAXIMO`, `TETO_DIA_MAXIMO` e os da janela).
// Aqui eles são fixos só porque nada é lido ainda; na B5-02 chegam na mesma
// resposta que traz os valores configurados, e é por isso que eles entram como
// dado, e não como constante do CRM.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { RitmoDoNumero } from "@/lib/whatsapp/gateway/tipos"
import { FormularioRitmo } from "./formulario-ritmo"

const LIMITES_DE_EXEMPLO: RitmoDoNumero["system_limits"] = {
  send_interval_seconds_min: 40,
  hourly_cap_max: 60,
  daily_cap_max: 500,
  send_window_earliest: "08:00",
  send_window_latest: "20:00",
}

const MADURO: RitmoDoNumero = {
  configured: {
    send_interval_seconds: 40,
    hourly_cap: 60,
    daily_cap: 500,
    send_window_start: "08:00:00",
    send_window_end: "20:00:00",
  },
  effective: {
    send_interval_seconds: 40,
    hourly_cap: 60,
    daily_cap: 500,
    send_window_start: "08:00:00",
    send_window_end: "20:00:00",
    warmup_applied: false,
  },
  system_limits: LIMITES_DE_EXEMPLO,
}

const NOVO: RitmoDoNumero = {
  configured: {
    send_interval_seconds: 60,
    hourly_cap: 60,
    daily_cap: 500,
    send_window_start: "09:00:00",
    send_window_end: "18:00:00",
  },
  // Número de 3 dias: o aquecimento aperta os tetos por cima do configurado.
  effective: {
    send_interval_seconds: 60,
    hourly_cap: 4,
    daily_cap: 30,
    send_window_start: "09:00:00",
    send_window_end: "18:00:00",
    warmup_applied: true,
  },
  system_limits: LIMITES_DE_EXEMPLO,
}

const EXEMPLOS = [
  { id: "maduro", rotulo: "Número maduro", ritmo: MADURO, dia: 84, aquecendo: false },
  { id: "novo", rotulo: "Número novo (dia 3)", ritmo: NOVO, dia: 3, aquecendo: true },
]

export function RitmoClient() {
  const [exemplo, setExemplo] = useState(EXEMPLOS[0])

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium mb-1">Protótipo</p>
        <p className="text-sm text-muted-foreground mb-3">
          Dados fixos e nada é salvo. Troque o estado para ver a diferença entre um número novo,
          onde o aquecimento limita, e um maduro.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXEMPLOS.map((e) => (
            <Button
              key={e.id}
              size="sm"
              variant={e.id === exemplo.id ? "default" : "outline"}
              onClick={() => setExemplo(e)}
            >
              {e.rotulo}
            </Button>
          ))}
        </div>
      </div>

      <FormularioRitmo
        // `key` força o formulário a renascer com os valores do outro exemplo:
        // sem isso os campos guardariam o estado do estado anterior.
        key={exemplo.id}
        ritmo={exemplo.ritmo}
        diaDeVida={exemplo.dia}
        emAquecimento={exemplo.aquecendo}
        salvar={async () => ({
          erro: "Protótipo: nada é salvo ainda. Gravar de verdade é a B5-02.",
        })}
      />
    </div>
  )
}
