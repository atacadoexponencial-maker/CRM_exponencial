// Formato do fluxo conferido no servidor. O editor manda o desenho como JSON, e
// o banco guarda como `jsonb`: nenhum dos dois garante o formato. `lerFluxo`
// devolve um `Fluxo` só com os campos conhecidos, ou `null`.
//
// Aqui só se confere a forma. Se o fluxo faz sentido (gatilho configurado,
// blocos ligados, sem laço, só o que o motor executa) é com `pendenciasDoFluxo`.

import { z } from "zod"
import {
  PARAMETROS_OBRIGATORIOS_ACAO,
  PARAMETROS_OBRIGATORIOS_GATILHO,
  type AcaoTipo,
  type Fluxo,
  type GatilhoTipo,
} from "@/lib/fluxo-automacao"

// Os registros de parâmetros obrigatórios têm uma chave por gatilho e por ação
const GATILHOS = Object.keys(PARAMETROS_OBRIGATORIOS_GATILHO) as [GatilhoTipo, ...GatilhoTipo[]]
const ACOES = Object.keys(PARAMETROS_OBRIGATORIOS_ACAO) as [AcaoTipo, ...AcaoTipo[]]

const id = z.string().min(1).max(100)
const texto = z.string().max(4000)
const posicao = z.object({ x: z.number().finite(), y: z.number().finite() })
const parametros = z.record(z.string().max(60), texto)

const bloco = z.discriminatedUnion("tipo", [
  z.object({ id, tipo: z.literal("gatilho"), gatilho: z.enum(GATILHOS), parametros, posicao }),
  z.object({
    id,
    tipo: z.literal("condicao"),
    // O tipo da verificação fica aberto: o que o motor não conhece vira pendência "em breve"
    verificacoes: z
      .array(z.object({ id, tipo: z.string().max(40), operador: z.string().max(40), valor: texto }))
      .max(20),
    posicao,
  }),
  z.object({ id, tipo: z.literal("acao"), acao: z.enum(ACOES), parametros, posicao }),
])

const fluxo = z
  .object({
    blocos: z.array(bloco).max(200),
    ligacoes: z.array(z.object({ de: id, saida: z.enum(["proximo", "sim", "nao"]), para: id })).max(400),
  })
  .refine((f) => new Set(f.blocos.map((b) => b.id)).size === f.blocos.length, "Dois blocos com o mesmo id")

export function lerFluxo(valor: unknown): Fluxo | null {
  const resultado = fluxo.safeParse(valor)
  return resultado.success ? (resultado.data as Fluxo) : null
}
