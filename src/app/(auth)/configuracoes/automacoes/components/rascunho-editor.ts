// Rascunho do editor de automações (B22-08). Fica no navegador, um por pessoa e
// por regra, para quem fecha a aba, volta do navegador ou sai pelo menu lateral
// recuperar o que não salvou. Não vale como regra: só o Salvar grava no banco, e
// o servidor confere tudo de novo. Se o navegador bloquear o armazenamento (aba
// anônima, por exemplo), o editor segue sem rascunho.

import { useEffect, useMemo, useSyncExternalStore } from "react"
import { lerFluxo } from "@/lib/automacoes/fluxo-recebido"
import { lerRepeticao, type Fluxo } from "@/lib/fluxo-automacao"
import type { RegraEditada } from "./editor-fluxo"

export interface RascunhoEditor {
  regra: RegraEditada
  /** Assinatura da versão salva de onde o rascunho partiu, para saber se ela mudou depois. */
  base: string
  /** Quando foi guardado, em ISO. */
  guardadoEm: string
}

/** Uma chave por pessoa e por regra; a regra ainda não salva é "nova". */
export function chaveDoRascunho(usuarioId: string, regraId: string | null): string {
  return `automacoes:rascunho:${usuarioId}:${regraId ?? "nova"}`
}

function ordenarChaves(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(ordenarChaves)
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.keys(valor)
        .sort()
        .map((k) => [k, ordenarChaves((valor as Record<string, unknown>)[k])])
    )
  }
  return valor
}

/**
 * Texto que muda só quando muda o que o Salvar grava. A ordem das chaves não
 * conta, e o nome vale sem espaço nas pontas, como é salvo.
 */
export function assinatura(regra: RegraEditada): string {
  return JSON.stringify(ordenarChaves({ nome: regra.nome.trim(), repeticao: regra.repeticao, fluxo: regra.fluxo }))
}

/**
 * Texto que muda só quando muda o que "Testar com um contato" percorre: arrastar
 * um bloco não conta. Diz se o resultado do teste ainda vale (B22-10).
 */
export function assinaturaDoCaminho(fluxo: Fluxo): string {
  return JSON.stringify(
    ordenarChaves({ blocos: fluxo.blocos.map((b) => ({ ...b, posicao: null })), ligacoes: fluxo.ligacoes })
  )
}

function lerBruto(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

/** O rascunho guardado, ou `null`. Rascunho fora do formato é apagado. */
export function lerRascunho(chave: string): RascunhoEditor | null {
  return interpretar(chave, lerBruto(chave))
}

function interpretar(chave: string, bruto: string | null): RascunhoEditor | null {
  if (!bruto) return null
  try {
    const r = JSON.parse(bruto) as { regra?: { nome?: unknown; repeticao?: unknown; fluxo?: unknown }; base?: unknown; guardadoEm?: unknown }
    const fluxo = lerFluxo(r.regra?.fluxo)
    if (
      fluxo &&
      typeof r.regra?.nome === "string" &&
      typeof r.base === "string" &&
      typeof r.guardadoEm === "string" &&
      !Number.isNaN(Date.parse(r.guardadoEm))
    ) {
      return {
        regra: { nome: r.regra.nome, repeticao: lerRepeticao(r.regra.repeticao), fluxo },
        base: r.base,
        guardadoEm: r.guardadoEm,
      }
    }
  } catch {
    // JSON quebrado: cai no apagar abaixo
  }
  apagarRascunho(chave)
  return null
}

export function guardarRascunho(chave: string, rascunho: RascunhoEditor) {
  try {
    localStorage.setItem(chave, JSON.stringify(rascunho))
  } catch {
    // armazenamento indisponível ou cheio: segue sem rascunho
  }
}

export function apagarRascunho(chave: string) {
  try {
    localStorage.removeItem(chave)
  } catch {
    // armazenamento indisponível: não há o que apagar
  }
}

// O que estava guardado quando o editor abriu. O editor grava o próprio rascunho
// depois, e esse não pode virar "rascunho achado" na mesma visita.
const daAbertura = new Map<string, string | null>()

const semAvisos = () => () => {}

/**
 * O rascunho que existia ao abrir o editor: `undefined` enquanto a página ainda
 * vem do servidor, que não tem navegador; depois, o rascunho ou `null`.
 */
export function useRascunhoDaAbertura(chave: string): RascunhoEditor | null | undefined {
  const bruto = useSyncExternalStore(
    semAvisos,
    () => {
      if (!daAbertura.has(chave)) daAbertura.set(chave, lerBruto(chave))
      return daAbertura.get(chave) ?? null
    },
    () => undefined
  )
  // Sair do editor esquece a leitura: voltar a ele lê de novo
  useEffect(() => () => void daAbertura.delete(chave), [chave])
  return useMemo(() => (bruto === undefined ? undefined : interpretar(chave, bruto)), [chave, bruto])
}
