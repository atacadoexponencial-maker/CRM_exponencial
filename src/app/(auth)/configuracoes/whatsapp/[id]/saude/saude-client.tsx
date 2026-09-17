"use client"

// Tela de saúde de um número (B4-01, protótipo).
//
// Três estados fixos, trocáveis na própria tela: é neles que o desenho se
// prova. Número maduro e tranquilo, número novo chegando no teto e número
// freado por falhas. Nenhuma chamada ao gateway — ligar os fios é a B4-02.

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AvisoDeFreio } from "./aviso-de-freio"
import { CartaoSaude } from "./cartao-saude"
import { IndicadorAquecimento } from "./indicador-aquecimento"
import { MedidorConsumo } from "./medidor-consumo"
import { SinalDeRisco } from "./sinal-de-risco"
import type { SaudeDoNumero } from "./tipos"

const HORA = 60 * 60 * 1000

const MADURO: SaudeDoNumero = {
  numero: "5511977776666",
  nomeExibicao: "Atacado Exemplo — Expansão",
  estado: "connected",
  tempoConectado24hMs: 23.5 * HORA,
  enviadasNaHora: 18,
  enviadasNoDia: 150,
  recebidasNaHora: 14,
  recebidasNoDia: 121,
  tetoHora: 60,
  tetoDia: 500,
  aquecimento: { ativo: false, dia: 84, ultimoDia: 30, tetoHora: 60, tetoDia: 500 },
  risco: { nivel: "baixo", razoes: [] },
  freio: { freado: false, motivo: null, desde: null, mensagensParadas: 0 },
  falhas: { falharam: 1, enviadas: 50, proporcao: 0.02 },
}

const EM_AQUECIMENTO: SaudeDoNumero = {
  numero: "5511955554444",
  nomeExibicao: "Atacado Exemplo — Prospecção",
  estado: "connected",
  tempoConectado24hMs: 21 * HORA,
  enviadasNaHora: 9,
  enviadasNoDia: 27,
  recebidasNaHora: 1,
  recebidasNoDia: 3,
  tetoHora: 10,
  tetoDia: 30,
  aquecimento: { ativo: true, dia: 3, ultimoDia: 30, tetoHora: 10, tetoDia: 30 },
  risco: {
    nivel: "medio",
    razoes: [
      "Quase no teto da hora: 9 de 10 mensagens já saíram nos últimos 60 minutos.",
      "Poucas respostas: 3 respostas para 27 mensagens enviadas nas últimas 24 horas.",
    ],
  },
  freio: { freado: false, motivo: null, desde: null, mensagensParadas: 0 },
  falhas: { falharam: 2, enviadas: 27, proporcao: 0.074 },
}

const FREADO: SaudeDoNumero = {
  numero: "5511933332222",
  nomeExibicao: "Atacado Exemplo — Campanhas",
  estado: "connected",
  tempoConectado24hMs: 22 * HORA,
  enviadasNaHora: 41,
  enviadasNoDia: 486,
  recebidasNaHora: 2,
  recebidasNoDia: 11,
  tetoHora: 60,
  tetoDia: 500,
  aquecimento: { ativo: false, dia: 45, ultimoDia: 30, tetoHora: 60, tetoDia: 500 },
  risco: {
    nivel: "alto",
    razoes: [
      "Envios interrompidos pelo freio de emergência, por excesso de falhas.",
      "1 em cada 4 envios recentes falhou: 12 falhas nos últimos 50 envios.",
      "Quase no teto do dia: 486 de 500 mensagens.",
      "Poucas respostas: 11 respostas para 486 mensagens enviadas nas últimas 24 horas.",
    ],
  },
  freio: {
    freado: true,
    motivo: "failure_rate",
    desde: "2026-09-17T11:04:00.000Z",
    mensagensParadas: 1840,
  },
  falhas: { falharam: 12, enviadas: 50, proporcao: 0.24 },
}

const EXEMPLOS: Array<{ id: string; rotulo: string; saude: SaudeDoNumero }> = [
  { id: "maduro", rotulo: "Número maduro", saude: MADURO },
  { id: "aquecendo", rotulo: "Em aquecimento", saude: EM_AQUECIMENTO },
  { id: "freado", rotulo: "Freado por falhas", saude: FREADO },
]

export function SaudeClient() {
  const [exemplo, setExemplo] = useState(EXEMPLOS[0])
  const saude = exemplo.saude

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium mb-1">Protótipo</p>
        <p className="text-sm text-muted-foreground mb-3">
          Dados fixos, para aprovar a forma. Troque o estado para ver os três casos que o desenho
          precisa cobrir.
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

      <AvisoDeFreio freio={saude.freio} />

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
