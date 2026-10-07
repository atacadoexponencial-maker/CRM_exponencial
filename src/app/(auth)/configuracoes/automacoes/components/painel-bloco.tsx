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
  type Opcao,
  type OpcoesEditor,
} from "./catalogo"
import { CampoSelecao, type ItemSelecao } from "./campo-selecao"

const textareaClass =
  "w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

const TITULO = { gatilho: "Gatilho", condicao: "Condição", acao: "Ação" } as const

const paraItens = (opcoes: Opcao[]): ItemSelecao[] => opcoes.map((o) => ({ valor: o.id, rotulo: o.nome }))

const ITENS_GATILHO = (Object.keys(GATILHOS) as GatilhoTipo[]).map((tipo) => ({ valor: tipo, rotulo: GATILHOS[tipo].rotulo }))
const ITENS_ACAO = (Object.keys(ACOES) as AcaoTipo[]).map((tipo) => ({ valor: tipo, rotulo: ACOES[tipo].rotulo }))

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
              <CampoSelecao
                id="painel-gatilho"
                valor={bloco.gatilho}
                itens={ITENS_GATILHO}
                onMudar={(valor) => onMudar({ ...bloco, gatilho: valor as GatilhoTipo, parametros: {} })}
              />
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
              <CampoSelecao
                id="painel-acao"
                valor={bloco.acao}
                itens={ITENS_ACAO}
                onMudar={(valor) => onMudar({ ...bloco, acao: valor as AcaoTipo, parametros: {} })}
              />
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
        <CampoSelecao
          id={id}
          valor={valor}
          vazio={campo.vazio}
          itens={paraItens(opcoesDaFonte(campo.fonte, opcoes))}
          onMudar={(novo) => onMudar(campo.chave, novo)}
        />
      )
    case "etapa":
      return (
        <CampoSelecao
          id={id}
          valor={valor}
          vazio={parametros.funil ? campo.vazio : "Escolha o funil primeiro"}
          itens={parametros.funil ? paraItens(etapasDoFunil(parametros.funil)) : []}
          desabilitado={!parametros.funil}
          onMudar={(novo) => onMudar("etapa", novo)}
        />
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
        <CampoSelecao
          id={id}
          valor={valor}
          vazio={campo.vazio}
          itens={paraItens(lista)}
          onMudar={(novo) => onMudar("valor", novo)}
        />
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

  const itensAtributo: ItemSelecao[] = (Object.keys(VERIFICACOES) as VerificacaoTipo[]).map((tipo) => {
    const soEmMensagem = VERIFICACOES_DE_MENSAGEM.includes(tipo) && !deMensagem
    return {
      valor: tipo,
      rotulo: VERIFICACOES[tipo].rotulo + (soEmMensagem ? " (só em gatilhos de mensagem)" : ""),
      desabilitado: soEmMensagem,
    }
  })

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
            <CampoSelecao
              aria-label="Atributo"
              valor={v.tipo}
              itens={itensAtributo}
              onMudar={(valor) => {
                const tipo = valor as VerificacaoTipo
                mudar(v.id, { tipo, operador: VERIFICACOES[tipo].operadores[0].id, valor: "" })
              }}
            />
            {invalida && (
              <p className="text-xs text-destructive">Não vale para este gatilho. Remova ou troque a verificação.</p>
            )}
            <CampoSelecao
              aria-label="Operador"
              valor={v.operador}
              itens={paraItens(item.operadores)}
              onMudar={(operador) => mudar(v.id, { operador })}
            />
            {pedeValor && item.valor.tipo === "texto" && (
              <Input
                aria-label="Valor"
                value={v.valor}
                placeholder={item.valor.placeholder}
                onChange={(e) => mudar(v.id, { valor: e.target.value })}
              />
            )}
            {pedeValor && item.valor.tipo === "opcoes" && (
              <CampoSelecao
                aria-label="Valor"
                valor={v.valor}
                vazio="Escolha…"
                itens={paraItens(opcoesDaFonte(item.valor.fonte, opcoes))}
                onMudar={(valor) => mudar(v.id, { valor })}
              />
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
      <CampoSelecao
        aria-label="Funil"
        valor={funil}
        vazio="Funil…"
        itens={paraItens(FUNIS)}
        onMudar={(novo) => onMudar(novo ? `${novo}:` : "")}
      />
      <CampoSelecao
        aria-label="Etapa"
        valor={etapa}
        vazio="Etapa…"
        itens={funil ? paraItens(etapasDoFunil(funil)) : []}
        desabilitado={!funil}
        onMudar={(novo) => onMudar(`${funil}:${novo}`)}
      />
    </div>
  )
}
