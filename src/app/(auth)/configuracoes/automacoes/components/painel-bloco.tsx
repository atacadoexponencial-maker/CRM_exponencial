"use client"

import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  GATILHOS_DE_MENSAGEM,
  OPERADORES_SEM_VALOR,
  VERIFICACOES_DE_MENSAGEM,
  type AcaoTipo,
  type Bloco,
  type BlocoCondicao,
  type GatilhoTipo,
  type Parametros,
  type Verificacao,
  type VerificacaoTipo,
} from "@/lib/fluxo-automacao"
import {
  ACOES,
  FUNIS,
  GATILHOS,
  VERIFICACOES,
  etapasDoFunil,
  opcoesDaFonte,
  opcoesDoCampoContato,
  type CampoTela,
  type OpcoesEditor,
} from "./catalogo"

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"

const textareaClass =
  "w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

const TITULO = { gatilho: "Gatilho", condicao: "Condição", acao: "Ação" } as const

interface PainelBlocoProps {
  bloco: Bloco
  /** Gatilho do fluxo: decide se as verificações de mensagem valem. */
  gatilho: GatilhoTipo | undefined
  opcoes: OpcoesEditor
  pendencias: string[]
  onMudar: (bloco: Bloco) => void
  onRemover: () => void
  onFechar: () => void
}

export function PainelBloco({ bloco, gatilho, opcoes, pendencias, onMudar, onRemover, onFechar }: PainelBlocoProps) {
  return (
    <aside className="absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l bg-background shadow-lg sm:w-80">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{TITULO[bloco.tipo]}</h2>
        <Button variant="ghost" size="icon-sm" onClick={onFechar} aria-label="Fechar painel">
          <X />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {bloco.tipo === "gatilho" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="painel-gatilho">Quando</Label>
              <select
                id="painel-gatilho"
                className={selectClass}
                value={bloco.gatilho}
                onChange={(e) => onMudar({ ...bloco, gatilho: e.target.value as GatilhoTipo, parametros: {} })}
              >
                {(Object.keys(GATILHOS) as GatilhoTipo[]).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {GATILHOS[tipo].rotulo}
                  </option>
                ))}
              </select>
            </div>
            <CamposParametros
              campos={GATILHOS[bloco.gatilho].campos}
              parametros={bloco.parametros}
              opcoes={opcoes}
              onMudar={(parametros) => onMudar({ ...bloco, parametros })}
            />
          </>
        )}

        {bloco.tipo === "acao" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="painel-acao">Fazer</Label>
              <select
                id="painel-acao"
                className={selectClass}
                value={bloco.acao}
                onChange={(e) => onMudar({ ...bloco, acao: e.target.value as AcaoTipo, parametros: {} })}
              >
                {(Object.keys(ACOES) as AcaoTipo[]).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {ACOES[tipo].rotulo}
                  </option>
                ))}
              </select>
            </div>
            <CamposParametros
              campos={ACOES[bloco.acao].campos}
              parametros={bloco.parametros}
              opcoes={opcoes}
              onMudar={(parametros) => onMudar({ ...bloco, parametros })}
            />
          </>
        )}

        {bloco.tipo === "condicao" && (
          <EditorVerificacoes bloco={bloco} gatilho={gatilho} opcoes={opcoes} onMudar={onMudar} />
        )}

        {pendencias.length > 0 && (
          <ul className="space-y-0.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {pendencias.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>

      {bloco.tipo !== "gatilho" && (
        <div className="border-t p-4">
          <Button variant="destructive" className="w-full" onClick={onRemover}>
            <Trash2 />
            Remover bloco
          </Button>
        </div>
      )}
    </aside>
  )
}

function CamposParametros({
  campos,
  parametros,
  opcoes,
  onMudar,
}: {
  campos: CampoTela[]
  parametros: Parametros
  opcoes: OpcoesEditor
  onMudar: (parametros: Parametros) => void
}) {
  function mudar(chave: string, valor: string) {
    const novos = { ...parametros, [chave]: valor }
    // Trocar o funil ou o campo invalida a etapa ou o valor escolhidos antes
    if (chave === "funil") novos.etapa = ""
    if (chave === "campo") novos.valor = ""
    onMudar(novos)
  }

  return (
    <>
      {campos.map((campo) => {
        const id = `painel-campo-${campo.chave}`
        const valor = parametros[campo.chave] ?? ""
        return (
          <div key={campo.chave} className="flex flex-col gap-1.5">
            <Label htmlFor={id}>{campo.rotulo}</Label>
            <CampoParametro id={id} campo={campo} valor={valor} parametros={parametros} opcoes={opcoes} onMudar={mudar} />
          </div>
        )
      })}
    </>
  )
}

function CampoParametro({
  id,
  campo,
  valor,
  parametros,
  opcoes,
  onMudar,
}: {
  id: string
  campo: CampoTela
  valor: string
  parametros: Parametros
  opcoes: OpcoesEditor
  onMudar: (chave: string, valor: string) => void
}) {
  switch (campo.tipo) {
    case "texto":
      return (
        <Input id={id} value={valor} placeholder={campo.placeholder} onChange={(e) => onMudar(campo.chave, e.target.value)} />
      )
    case "texto_longo":
      return (
        <>
          <textarea
            id={id}
            className={textareaClass}
            value={valor}
            placeholder={campo.placeholder}
            onChange={(e) => onMudar(campo.chave, e.target.value)}
          />
          {campo.ajuda && <p className="text-xs text-muted-foreground">{campo.ajuda}</p>}
        </>
      )
    case "opcoes":
      return (
        <select id={id} className={selectClass} value={valor} onChange={(e) => onMudar(campo.chave, e.target.value)}>
          <option value="">{campo.vazio}</option>
          {opcoesDaFonte(campo.fonte, opcoes).map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      )
    case "etapa":
      return (
        <select
          id={id}
          className={selectClass}
          value={valor}
          disabled={!parametros.funil}
          onChange={(e) => onMudar("etapa", e.target.value)}
        >
          <option value="">{parametros.funil ? campo.vazio : "Escolha o funil primeiro"}</option>
          {parametros.funil &&
            etapasDoFunil(parametros.funil).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
        </select>
      )
    case "valor_do_campo": {
      const lista = opcoesDoCampoContato(parametros.campo, opcoes)
      if (!parametros.campo) {
        return <Input id={id} disabled placeholder="Escolha o campo primeiro" value="" onChange={() => {}} />
      }
      if (!lista) {
        return <Input id={id} value={valor} onChange={(e) => onMudar("valor", e.target.value)} />
      }
      return (
        <select id={id} className={selectClass} value={valor} onChange={(e) => onMudar("valor", e.target.value)}>
          <option value="">{campo.vazio}</option>
          {lista.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      )
    }
    case "arquivo":
      return (
        <>
          <input
            id={id}
            type="file"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            className="text-sm file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1 file:text-sm"
            onChange={(e) => onMudar(campo.chave, e.target.files?.[0]?.name ?? "")}
          />
          {valor && <p className="text-xs text-muted-foreground">Escolhido: {valor}</p>}
        </>
      )
  }
}

function EditorVerificacoes({
  bloco,
  gatilho,
  opcoes,
  onMudar,
}: {
  bloco: BlocoCondicao
  gatilho: GatilhoTipo | undefined
  opcoes: OpcoesEditor
  onMudar: (bloco: Bloco) => void
}) {
  const deMensagem = gatilho ? GATILHOS_DE_MENSAGEM.includes(gatilho) : false

  function mudarVerificacoes(verificacoes: Verificacao[]) {
    onMudar({ ...bloco, verificacoes })
  }

  function mudar(id: string, mudanca: Partial<Verificacao>) {
    mudarVerificacoes(bloco.verificacoes.map((v) => (v.id === id ? { ...v, ...mudanca } : v)))
  }

  function adicionar() {
    const tipo: VerificacaoTipo = deMensagem ? "texto_mensagem" : "tag_contato"
    mudarVerificacoes([
      ...bloco.verificacoes,
      { id: crypto.randomUUID(), tipo, operador: VERIFICACOES[tipo].operadores[0].id, valor: "" },
    ])
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Todas as verificações precisam valer para seguir pelo <strong>sim</strong>. Para &quot;uma coisa ou
        outra&quot;, ligue o <strong>não</strong> a outra condição.
      </p>

      {bloco.verificacoes.map((v, i) => {
        const item = VERIFICACOES[v.tipo]
        const invalida = !deMensagem && VERIFICACOES_DE_MENSAGEM.includes(v.tipo)
        const pedeValor = item.valor.tipo !== "nenhum" && !OPERADORES_SEM_VALOR.includes(v.operador)
        return (
          <div
            key={v.id}
            className={cn("flex flex-col gap-2 rounded-lg border p-2.5", invalida && "border-destructive bg-destructive/5")}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{i === 0 ? "Se" : "e"}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Remover verificação"
                onClick={() => mudarVerificacoes(bloco.verificacoes.filter((x) => x.id !== v.id))}
              >
                <X />
              </Button>
            </div>
            <select
              aria-label="Atributo"
              className={selectClass}
              value={v.tipo}
              onChange={(e) => {
                const tipo = e.target.value as VerificacaoTipo
                mudar(v.id, { tipo, operador: VERIFICACOES[tipo].operadores[0].id, valor: "" })
              }}
            >
              {(Object.keys(VERIFICACOES) as VerificacaoTipo[]).map((tipo) => {
                const soMensagem = VERIFICACOES_DE_MENSAGEM.includes(tipo)
                return (
                  <option key={tipo} value={tipo} disabled={soMensagem && !deMensagem}>
                    {VERIFICACOES[tipo].rotulo}
                    {soMensagem && !deMensagem ? " (só em gatilhos de mensagem)" : ""}
                  </option>
                )
              })}
            </select>
            {invalida && (
              <p className="text-xs text-destructive">Não vale para este gatilho. Remova ou troque a verificação.</p>
            )}
            <select
              aria-label="Operador"
              className={selectClass}
              value={v.operador}
              onChange={(e) => mudar(v.id, { operador: e.target.value })}
            >
              {item.operadores.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
            {pedeValor && item.valor.tipo === "texto" && (
              <Input
                aria-label="Valor"
                value={v.valor}
                placeholder={item.valor.placeholder}
                onChange={(e) => mudar(v.id, { valor: e.target.value })}
              />
            )}
            {pedeValor && item.valor.tipo === "opcoes" && (
              <select
                aria-label="Valor"
                className={selectClass}
                value={v.valor}
                onChange={(e) => mudar(v.id, { valor: e.target.value })}
              >
                <option value="">Escolha…</option>
                {opcoesDaFonte(item.valor.fonte, opcoes).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nome}
                  </option>
                ))}
              </select>
            )}
            {pedeValor && item.valor.tipo === "funil_etapa" && (
              <SeletorFunilEtapa valor={v.valor} onMudar={(valor) => mudar(v.id, { valor })} />
            )}
          </div>
        )
      })}

      <Button variant="outline" size="sm" onClick={adicionar}>
        <Plus />
        Adicionar verificação
      </Button>
    </div>
  )
}

/** Valor no formato `funil:etapa`. Só fica completo com os dois escolhidos. */
function SeletorFunilEtapa({ valor, onMudar }: { valor: string; onMudar: (valor: string) => void }) {
  const [funil = "", etapa = ""] = valor.split(":")
  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        aria-label="Funil"
        className={selectClass}
        value={funil}
        onChange={(e) => onMudar(e.target.value ? `${e.target.value}:` : "")}
      >
        <option value="">Funil…</option>
        {FUNIS.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </select>
      <select
        aria-label="Etapa"
        className={selectClass}
        value={etapa}
        disabled={!funil}
        onChange={(e) => onMudar(`${funil}:${e.target.value}`)}
      >
        <option value="">Etapa…</option>
        {funil &&
          etapasDoFunil(funil).map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
      </select>
    </div>
  )
}
