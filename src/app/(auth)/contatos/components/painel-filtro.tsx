"use client"

// B37-01: painel onde a pessoa monta o filtro avançado da lista de contatos.
// Só monta o rascunho; a lista muda ao clicar em "Aplicar" (PER-B37-07). Quem
// filtra é o servidor; aqui só se marca o que ainda está incompleto.

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import {
  TODOS_OS_CAMPOS,
  campoDoFiltro,
  comparacoesDoCampo,
  condicaoCompleta,
  rotuloDaComparacao,
  valoresPedidos,
  type CampoDoFiltro,
  type Comparacao,
  type Condicao,
  type Filtro,
  type Grupo,
  type Juncao,
  type Opcao,
  type ValoresDaEmpresa,
  valorSumiu,
} from "@/lib/filtro-contatos"

const selectClass =
  "h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
const inputClass = selectClass

const CONDICAO_NOVA: Condicao = { campo: "", comparacao: "", valores: [] }
const grupoNovo = (): Grupo => ({ juncao: "e", condicoes: [{ ...CONDICAO_NOVA }] })

const ASSUNTOS = Array.from(new Set(TODOS_OS_CAMPOS.map((c) => c.assunto)))

interface PainelFiltroProps {
  aberto: boolean
  onAbertoChange: (aberto: boolean) => void
  /** Filtro aplicado hoje; o painel abre com uma cópia dele. */
  filtro: Filtro
  nichos: string[]
  atendentes: Array<{ id: string; nome: string }>
  /** B37-02: etiquetas da empresa. */
  etiquetas: string[]
  onAplicar: (filtro: Filtro) => void
  onLimpar: () => void
  /** B37-03: Admin e Gerente salvam e atualizam filtros (o servidor confere de novo). */
  podeSalvar?: boolean
  /** Nome do filtro salvo ligado agora, se algum: habilita "Atualizar filtro salvo". */
  salvoAtivo?: string | null
  /** Devolvem a mensagem de erro do servidor, ou null quando deu certo. */
  onSalvar?: (nome: string, filtro: Filtro) => Promise<string | null>
  onAtualizar?: (filtro: Filtro) => Promise<string | null>
}

export function PainelFiltro({
  aberto,
  onAbertoChange,
  filtro,
  nichos,
  atendentes,
  etiquetas,
  onAplicar,
  onLimpar,
  podeSalvar = false,
  salvoAtivo = null,
  onSalvar,
  onAtualizar,
}: PainelFiltroProps) {
  const [rascunho, setRascunho] = useState<Filtro>(() => paraEditar(filtro))
  // B37-03: nome do filtro novo, enquanto a pessoa salva.
  const [nomeNovo, setNomeNovo] = useState<string | null>(null)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const daEmpresa: ValoresDaEmpresa = { nichos, atendentes: atendentes.map((a) => a.id), etiquetas }

  async function enviar(acao: () => Promise<string | null>) {
    setSalvando(true)
    setErroSalvar(null)
    try {
      const erro = await acao()
      if (erro) setErroSalvar(erro)
      else setNomeNovo(null)
    } catch {
      setErroSalvar("Não foi possível salvar. Tente de novo.")
    } finally {
      setSalvando(false)
    }
  }
  // Reabrir o painel recomeça do filtro aplicado.
  const [abertoAntes, setAbertoAntes] = useState(aberto)
  if (aberto !== abertoAntes) {
    setAbertoAntes(aberto)
    if (aberto) {
      setRascunho(paraEditar(filtro))
      setNomeNovo(null)
      setErroSalvar(null)
    }
  }

  function opcoesDoCampo(campo: CampoDoFiltro): Opcao[] {
    if (campo.opcoes) return campo.opcoes
    if (campo.id === "nicho") return nichos.map((n) => ({ valor: n, rotulo: n }))
    if (campo.id === "atendente") return atendentes.map((a) => ({ valor: a.id, rotulo: a.nome }))
    if (campo.id === "etiqueta") return etiquetas.map((e) => ({ valor: e, rotulo: e }))
    return []
  }

  function mudarGrupo(i: number, mudar: (g: Grupo) => Grupo | null) {
    setRascunho((r) => {
      const grupos = r.grupos.map((g, j) => (j === i ? mudar(g) : g)).filter((g): g is Grupo => g !== null)
      return { ...r, grupos }
    })
  }

  function mudarCondicao(i: number, k: number, mudar: (c: Condicao) => Condicao) {
    mudarGrupo(i, (g) => ({ ...g, condicoes: g.condicoes.map((c, j) => (j === k ? mudar(c) : c)) }))
  }

  function removerCondicao(i: number, k: number) {
    mudarGrupo(i, (g) => {
      const condicoes = g.condicoes.filter((_, j) => j !== k)
      return condicoes.length > 0 ? { ...g, condicoes } : null
    })
  }

  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogPopup className="flex max-h-[85vh] max-w-2xl flex-col gap-0 p-0 max-sm:inset-0 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <DialogTitle className="text-base">Filtrar contatos</DialogTitle>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => onAbertoChange(false)}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {rascunho.grupos.map((grupo, i) => (
            <div key={i}>
              {i > 0 && (
                <div className="mb-3 flex items-center gap-2">
                  <ChaveJuncao
                    rotulo="Junção entre os grupos"
                    valor={rascunho.juncao}
                    onChange={(juncao) => setRascunho((r) => ({ ...r, juncao }))}
                  />
                </div>
              )}
              <section aria-label={`Grupo ${i + 1}`} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Grupo {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => mudarGrupo(i, () => null)}
                    className="text-xs text-muted-foreground hover:text-erro"
                  >
                    Remover grupo
                  </button>
                </div>

                <div className="space-y-2">
                  {grupo.condicoes.map((condicao, k) => (
                    <div key={k}>
                      {k > 0 && (
                        <ChaveJuncao
                          rotulo={`Junção dentro do grupo ${i + 1}`}
                          valor={grupo.juncao}
                          onChange={(juncao) => mudarGrupo(i, (g) => ({ ...g, juncao }))}
                          pequena
                        />
                      )}
                      <LinhaCondicao
                        condicao={condicao}
                        daEmpresa={daEmpresa}
                        opcoesDoCampo={opcoesDoCampo}
                        onChange={(c) => mudarCondicao(i, k, () => c)}
                        onRemover={() => removerCondicao(i, k)}
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => mudarGrupo(i, (g) => ({ ...g, condicoes: [...g.condicoes, { ...CONDICAO_NOVA }] }))}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="size-3.5" /> Acrescentar condição
                </button>
              </section>
            </div>
          ))}

          <button
            type="button"
            onClick={() => setRascunho((r) => ({ ...r, grupos: [...r.grupos, grupoNovo()] }))}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-4" /> Acrescentar grupo
          </button>
        </div>

        {podeSalvar && nomeNovo !== null && (
          <form
            className="flex flex-wrap items-center gap-2 border-t px-5 py-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (onSalvar) enviar(() => onSalvar(nomeNovo, rascunho))
            }}
          >
            <input
              aria-label="Nome do filtro"
              placeholder="Nome do filtro"
              maxLength={60}
              autoFocus
              className={cn(inputClass, "h-9 min-w-0 flex-1")}
              value={nomeNovo}
              onChange={(e) => setNomeNovo(e.target.value)}
            />
            <Button type="button" variant="ghost" onClick={() => { setNomeNovo(null); setErroSalvar(null) }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              Salvar
            </Button>
          </form>
        )}
        {erroSalvar && <p className="px-5 pb-2 text-xs text-erro">{erroSalvar}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-5 py-3">
          <div className="flex flex-wrap gap-1">
            <Button type="button" variant="ghost" onClick={onLimpar}>
              Limpar filtro
            </Button>
            {podeSalvar && salvoAtivo && onAtualizar && (
              <Button type="button" variant="outline" disabled={salvando} onClick={() => enviar(() => onAtualizar(rascunho))}>
                Atualizar filtro salvo
              </Button>
            )}
            {podeSalvar && nomeNovo === null && (
              <Button type="button" variant="outline" onClick={() => { setErroSalvar(null); setNomeNovo("") }}>
                Salvar filtro
              </Button>
            )}
          </div>
          <Button type="button" onClick={() => onAplicar(rascunho)}>
            Aplicar
          </Button>
        </div>
      </DialogPopup>
    </Dialog>
  )
}

/** Sem grupo nenhum, o painel abre com um grupo vazio para começar (CA-B37-01). */
function paraEditar(filtro: Filtro): Filtro {
  const copia: Filtro = {
    juncao: filtro.juncao,
    grupos: filtro.grupos.map((g) => ({ juncao: g.juncao, condicoes: g.condicoes.map((c) => ({ ...c, valores: [...c.valores] })) })),
  }
  return copia.grupos.length > 0 ? copia : { ...copia, grupos: [grupoNovo()] }
}

function ChaveJuncao({
  rotulo,
  valor,
  onChange,
  pequena = false,
}: {
  rotulo: string
  valor: Juncao
  onChange: (juncao: Juncao) => void
  pequena?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={cn("inline-flex rounded-md border", pequena && "my-1")}>
      {(["e", "ou"] as const).map((j) => (
        <button
          key={j}
          type="button"
          role="radio"
          aria-checked={valor === j}
          onClick={() => onChange(j)}
          className={cn(
            "px-2.5 py-0.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md",
            valor === j ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          {j === "e" ? "E" : "OU"}
        </button>
      ))}
    </div>
  )
}

function LinhaCondicao({
  condicao,
  daEmpresa,
  opcoesDoCampo,
  onChange,
  onRemover,
}: {
  condicao: Condicao
  daEmpresa: ValoresDaEmpresa
  opcoesDoCampo: (campo: CampoDoFiltro) => Opcao[]
  onChange: (condicao: Condicao) => void
  onRemover: () => void
}) {
  const campo = campoDoFiltro(condicao.campo)
  const comparacao = condicao.comparacao || null
  // B37-03: em filtro salvo, o valor pode ter deixado de existir (SUP-B37-05).
  const sumiu = valorSumiu(condicao, daEmpresa)
  const incompleta = !!campo && !sumiu && !condicaoCompleta(condicao)

  function escolherCampo(id: string) {
    const novo = campoDoFiltro(id)
    onChange({ campo: id, comparacao: novo ? comparacoesDoCampo(novo)[0] : "", valores: [] })
  }

  function escolherComparacao(c: Comparacao) {
    const mesmaForma = comparacao && valoresPedidos(comparacao) === valoresPedidos(c)
    onChange({ ...condicao, comparacao: c, valores: mesmaForma ? condicao.valores : [] })
  }

  function mudarValor(posicao: number, valor: string) {
    const valores = [...condicao.valores]
    valores[posicao] = valor
    onChange({ ...condicao, valores })
  }

  return (
    <div className="flex flex-wrap items-center gap-2" data-incompleta={incompleta || undefined}>
      <select aria-label="Campo" className={cn(selectClass, "max-sm:w-full")} value={condicao.campo} onChange={(e) => escolherCampo(e.target.value)}>
        <option value="" disabled>
          Escolha o campo
        </option>
        {ASSUNTOS.map((assunto) => (
          <optgroup key={assunto} label={assunto}>
            {TODOS_OS_CAMPOS.filter((c) => c.assunto === assunto).map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {campo && (
        <select
          aria-label="Comparação"
          className={selectClass}
          value={condicao.comparacao}
          onChange={(e) => escolherComparacao(e.target.value as Comparacao)}
        >
          {comparacoesDoCampo(campo).map((c) => (
            <option key={c} value={c}>
              {rotuloDaComparacao(campo, c)}
            </option>
          ))}
        </select>
      )}

      {campo && comparacao && (
        <CampoDeValor
          campo={campo}
          comparacao={comparacao}
          valores={condicao.valores}
          opcoes={opcoesDoCampo(campo)}
          onValor={mudarValor}
          onValores={(valores) => onChange({ ...condicao, valores })}
        />
      )}

      {incompleta && <span className="text-xs text-aviso">Incompleta</span>}
      {sumiu && <span className="text-xs text-erro">Valor não existe mais</span>}

      <button
        type="button"
        aria-label="Remover condição"
        onClick={onRemover}
        className="ml-auto inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-erro-fundo hover:text-erro"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

function CampoDeValor({
  campo,
  comparacao,
  valores,
  opcoes,
  onValor,
  onValores,
}: {
  campo: CampoDoFiltro
  comparacao: Comparacao
  valores: string[]
  opcoes: Opcao[]
  onValor: (posicao: number, valor: string) => void
  onValores: (valores: string[]) => void
}) {
  const forma = valoresPedidos(comparacao)
  if (forma === "nenhum") return null

  if (comparacao === "ultimos_dias" || comparacao === "ha_mais_de_dias") {
    return (
      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <input
          aria-label="Valor"
          type="number"
          min={1}
          inputMode="numeric"
          className={cn(inputClass, "numero w-20")}
          value={valores[0] ?? ""}
          onChange={(e) => onValor(0, e.target.value)}
        />
        dias
      </span>
    )
  }

  if (campo.tipo === "data") {
    return (
      <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <input aria-label="Valor" type="date" className={inputClass} value={valores[0] ?? ""} onChange={(e) => onValor(0, e.target.value)} />
        {forma === "dois" && (
          <>
            e
            <input aria-label="Até" type="date" className={inputClass} value={valores[1] ?? ""} onChange={(e) => onValor(1, e.target.value)} />
          </>
        )}
      </span>
    )
  }

  if (campo.tipo === "numero") {
    return (
      <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <input
          aria-label="Valor"
          type="number"
          min={0}
          step={campo.id === "total_comprado" ? "0.01" : "1"}
          inputMode="decimal"
          className={cn(inputClass, "numero w-28")}
          value={valores[0] ?? ""}
          onChange={(e) => onValor(0, e.target.value)}
        />
        {forma === "dois" && (
          <>
            e
            <input
              aria-label="Até"
              type="number"
              min={0}
              step={campo.id === "total_comprado" ? "0.01" : "1"}
              inputMode="decimal"
              className={cn(inputClass, "numero w-28")}
              value={valores[1] ?? ""}
              onChange={(e) => onValor(1, e.target.value)}
            />
          </>
        )}
      </span>
    )
  }

  if (forma === "varios") {
    return (
      <fieldset aria-label="Valores" className="flex max-h-32 w-full flex-wrap gap-x-3 gap-y-1 overflow-y-auto rounded-lg border p-2">
        {opcoes.map((o) => (
          <label key={o.valor} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={valores.includes(o.valor)}
              onChange={(e) =>
                onValores(e.target.checked ? [...valores, o.valor] : valores.filter((v) => v !== o.valor))
              }
            />
            {o.rotulo}
          </label>
        ))}
      </fieldset>
    )
  }

  if (campo.tipo === "lista" || campo.tipo === "etiqueta" || campo.tipo === "funil") {
    return (
      <select aria-label="Valor" className={cn(selectClass, "max-sm:flex-1")} value={valores[0] ?? ""} onChange={(e) => onValor(0, e.target.value)}>
        <option value="" disabled>
          Escolha
        </option>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      aria-label="Valor"
      type="text"
      className={cn(inputClass, "w-48 max-sm:flex-1")}
      value={valores[0] ?? ""}
      onChange={(e) => onValor(0, e.target.value)}
    />
  )
}
