"use client"

// Formulário de ritmo de um número (B5-01, dados reais na B5-02).
//
// Os limites do sistema **vêm do gateway**, na mesma resposta que traz os
// valores configurados, e alimentam tanto o texto ao lado de cada campo quanto
// a validação do formulário. Escrevê-los aqui os faria sair de sincronia com a
// Parte A no primeiro ajuste — e o cliente veria "máximo 500" numa tela que
// aceita 350.
//
// A validação existe nos dois lados: Zod aqui, para o erro aparecer sem ida ao
// servidor, e a regra no backend, que é a que vale.

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Clock, Gauge, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { estimarCampanha } from "@/lib/estimativa-campanha"
import type { RitmoDoNumero } from "@/lib/whatsapp/gateway/tipos"

/** Tamanho de campanha usado na estimativa da tela. Só ilustra a ordem de grandeza. */
const CAMPANHA_DE_REFERENCIA = 500

function minutosDoHorario(horario: string): number {
  const [h, m] = horario.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** "08:00:00" do Postgres vira "08:00" do input de hora. */
function horaCurta(valor: string): string {
  return valor.slice(0, 5)
}

function criarSchema(limites: RitmoDoNumero["system_limits"]) {
  return z
    .object({
      send_interval_seconds: z.coerce
        .number()
        .int("Use um número inteiro de segundos")
        .min(
          limites.send_interval_seconds_min,
          `O mínimo é ${limites.send_interval_seconds_min} segundos`
        ),
      hourly_cap: z.coerce
        .number()
        .int("Use um número inteiro")
        .min(1, "O mínimo é 1")
        .max(limites.hourly_cap_max, `O máximo é ${limites.hourly_cap_max}`),
      daily_cap: z.coerce
        .number()
        .int("Use um número inteiro")
        .min(1, "O mínimo é 1")
        .max(limites.daily_cap_max, `O máximo é ${limites.daily_cap_max}`),
      send_window_start: z.string().min(1, "Informe o início"),
      send_window_end: z.string().min(1, "Informe o fim"),
    })
    .refine((v) => minutosDoHorario(v.send_window_start) >= minutosDoHorario(limites.send_window_earliest), {
      path: ["send_window_start"],
      message: `Não pode começar antes de ${limites.send_window_earliest}`,
    })
    .refine((v) => minutosDoHorario(v.send_window_end) <= minutosDoHorario(limites.send_window_latest), {
      path: ["send_window_end"],
      message: `Não pode terminar depois de ${limites.send_window_latest}`,
    })
    .refine((v) => minutosDoHorario(v.send_window_end) > minutosDoHorario(v.send_window_start), {
      path: ["send_window_end"],
      message: "O fim precisa ser depois do início",
    })
}

type FormData = {
  send_interval_seconds: number
  hourly_cap: number
  daily_cap: number
  send_window_start: string
  send_window_end: string
}

export type ValoresDeRitmo = {
  send_interval_seconds: number
  hourly_cap: number
  daily_cap: number
  send_window_start: string
  send_window_end: string
}

export function FormularioRitmo({
  ritmo,
  /** Dia de vida do número: é ele que define o perfil sugerido. */
  diaDeVida,
  emAquecimento,
  salvar,
}: {
  ritmo: RitmoDoNumero
  diaDeVida: number | null
  emAquecimento: boolean
  /**
   * Quem grava. Recebido por parâmetro para o formulário não saber se o destino
   * é o gateway (B5-02) ou nada (protótipo da B5-01).
   */
  salvar: (valores: ValoresDeRitmo) => Promise<{ erro?: string }>
}) {
  const router = useRouter()
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const limites = ritmo.system_limits
  const schema = useMemo(() => criarSchema(limites), [limites])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      send_interval_seconds: ritmo.configured.send_interval_seconds,
      hourly_cap: ritmo.configured.hourly_cap,
      daily_cap: ritmo.configured.daily_cap,
      send_window_start: horaCurta(ritmo.configured.send_window_start),
      send_window_end: horaCurta(ritmo.configured.send_window_end),
    },
  })

  const atual = watch()

  /**
   * Perfil sugerido: conservador enquanto o número é novo.
   *
   * Quem sabe a idade do número é o gateway, e ela chega pelo endpoint de
   * saúde. Sem essa informação, a sugestão é a do número maduro — que é a mais
   * larga, e por isso o gateway continua apertando por cima dela.
   */
  const sugerido: FormData = useMemo(() => {
    const novo = emAquecimento || (diaDeVida !== null && diaDeVida <= 30)
    return {
      send_interval_seconds: novo ? Math.max(limites.send_interval_seconds_min, 90) : limites.send_interval_seconds_min,
      hourly_cap: novo ? Math.min(limites.hourly_cap_max, 10) : limites.hourly_cap_max,
      daily_cap: novo ? Math.min(limites.daily_cap_max, 50) : limites.daily_cap_max,
      send_window_start: "09:00",
      send_window_end: "18:00",
    }
  }, [emAquecimento, diaDeVida, limites])

  const estimativa = estimarCampanha(CAMPANHA_DE_REFERENCIA, {
    intervaloSegundos: Number(atual.send_interval_seconds) || limites.send_interval_seconds_min,
    tetoHora: Number(atual.hourly_cap) || 1,
    tetoDia: Number(atual.daily_cap) || 1,
    janelaInicioMin: minutosDoHorario(atual.send_window_start || "08:00"),
    janelaFimMin: minutosDoHorario(atual.send_window_end || "20:00"),
  })

  async function onSubmit(data: FormData) {
    setErroGeral(null)
    setSalvo(false)

    const resultado = await salvar(data)
    if (resultado.erro) {
      setErroGeral(resultado.erro)
      return
    }

    setSalvo(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {ritmo.effective.warmup_applied && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/40">
          Este número está em aquecimento. Enquanto estiver, valem{" "}
          <strong>{ritmo.effective.hourly_cap} por hora</strong> e{" "}
          <strong>{ritmo.effective.daily_cap} por dia</strong>, mesmo que você configure mais —
          o aquecimento aperta por cima, nunca afrouxa.
        </p>
      )}

      <div className="rounded-lg border p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium mb-4">
          <Gauge className="size-4 shrink-0" aria-hidden />
          Ritmo de envio
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="send_interval_seconds">Intervalo entre mensagens</Label>
            <Input
              id="send_interval_seconds"
              type="number"
              inputMode="numeric"
              className="mt-1.5"
              {...register("send_interval_seconds")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Mínimo {limites.send_interval_seconds_min}s
            </p>
            {errors.send_interval_seconds && (
              <p className="text-xs text-destructive mt-1">{errors.send_interval_seconds.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="hourly_cap">Teto por hora</Label>
            <Input
              id="hourly_cap"
              type="number"
              inputMode="numeric"
              className="mt-1.5"
              {...register("hourly_cap")}
            />
            <p className="text-xs text-muted-foreground mt-1">Máximo {limites.hourly_cap_max}</p>
            {errors.hourly_cap && (
              <p className="text-xs text-destructive mt-1">{errors.hourly_cap.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="daily_cap">Teto por dia</Label>
            <Input
              id="daily_cap"
              type="number"
              inputMode="numeric"
              className="mt-1.5"
              {...register("daily_cap")}
            />
            <p className="text-xs text-muted-foreground mt-1">Máximo {limites.daily_cap_max}</p>
            {errors.daily_cap && (
              <p className="text-xs text-destructive mt-1">{errors.daily_cap.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="flex items-center gap-2 text-sm font-medium mb-4">
          <Clock className="size-4 shrink-0" aria-hidden />
          Janela de envio
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="send_window_start">Começa às</Label>
            <Input
              id="send_window_start"
              type="time"
              className="mt-1.5"
              {...register("send_window_start")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Não antes de {limites.send_window_earliest}
            </p>
            {errors.send_window_start && (
              <p className="text-xs text-destructive mt-1">{errors.send_window_start.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="send_window_end">Termina às</Label>
            <Input
              id="send_window_end"
              type="time"
              className="mt-1.5"
              {...register("send_window_end")}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Não depois de {limites.send_window_latest}
            </p>
            {errors.send_window_end && (
              <p className="text-xs text-destructive mt-1">{errors.send_window_end.message}</p>
            )}
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-3">Horário de São Paulo.</p>
      </div>

      <p className="rounded-lg border bg-muted/40 p-4 text-sm">{estimativa.texto}</p>

      {erroGeral && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
          {erroGeral}
        </p>
      )}

      {salvo && !erroGeral && (
        <p className="text-sm text-green-700 dark:text-green-500">Ritmo salvo.</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar ritmo"}
        </Button>

        <Button type="button" variant="outline" onClick={() => reset(sugerido)}>
          <Wand2 className="size-4" aria-hidden />
          Aplicar perfil sugerido
        </Button>

        <span className="text-xs text-muted-foreground">
          {emAquecimento || (diaDeVida !== null && diaDeVida <= 30)
            ? "Sugestão para número novo: devagar, com janela curta."
            : "Sugestão para número maduro: os limites cheios do sistema."}
        </span>
      </div>
    </form>
  )
}
