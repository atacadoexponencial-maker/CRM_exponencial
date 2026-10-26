"use client"

import { useRef, useState } from "react"
import { Copy, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  ACOES_DISPONIVEIS,
  ESPERA_SEM_OPCAO,
  OPCOES_DE_ESPERA_DISPONIVEIS,
  duracaoDaEspera,
  saidasDaEspera,
  type BlocoEspera,
  type SaidaDaEspera,
  type UnidadeDaEspera,
  GATILHOS_DE_MENSAGEM,
  GATILHOS_DISPONIVEIS,
  HORAS_MAXIMAS,
  OPERADORES_SEM_VALOR,
  REPETICAO_DISPONIVEL,
  ACOES_REMOVIDAS,
  VERIFICACOES_DE_MENSAGEM,
  VERIFICACOES_DISPONIVEIS,
  horasValidas,
  itensDaLista,
  parametrosIniciaisDoGatilho,
  vencimentoDoLembrete,
  type AcaoTipo,
  type Bloco,
  type BlocoCondicao,
  type GatilhoTipo,
  type Parametros,
  type Repeticao,
  type Verificacao,
  type VerificacaoTipo,
} from "@/lib/fluxo-automacao"
import { ARQUIVO_GRANDE_DEMAIS, LIMITE_DO_ARQUIVO } from "@/lib/automacoes/referencias"
import { descreverHorario } from "@/lib/horario-comercial"
import {
  ACOES,
  funisDoEditor,
  GATILHOS,
  NAO_EXISTE_MAIS,
  VERIFICACOES,
  etapasDoFunil,
  opcoesDaFonte,
  opcoesDoCampoContato,
  campoPersonalizadoDoEditor,
  type CampoTela,
  type Opcao,
  type OpcoesEditor,
} from "./catalogo"
import { campoDoFiltro, campoPersonalizado, comparacoesDoCampo, rotuloDaComparacao, valoresPedidos, type CampoParaFiltro, type Comparacao } from "@/lib/filtro-contatos"
import { conferirValor, entradaDoCanonico, type TipoDeCampo } from "@/lib/campos-personalizados"
import { CampoSelecao, type ItemSelecao } from "./campo-selecao"
import { CampoVarias } from "./campo-varias"
import { variaveisDaAutomacao } from "./variaveis-mensagem"
import { TextoComVariaveis } from "@/components/shared/texto-com-variaveis"

const textareaClass =
  "w-full min-h-24 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

const TITULO = { gatilho: "Gatilho", condicao: "Condição", acao: "Ação", espera: "Esperar" } as const

const paraItens = (opcoes: Opcao[]): ItemSelecao[] => opcoes.map((o) => ({ valor: o.id, rotulo: o.nome }))

/** O que dizer quando a lista da empresa está vazia, e onde criar (B22-34). */
const LISTA_VAZIA: Partial<Record<string, { texto: string; link: string; onde: string }>> = {
  mensagensRapidas: {
    texto: "Nenhuma mensagem rápida criada ainda.",
    link: "Criar em Mensagens rápidas",
    onde: "/configuracoes/mensagens-rapidas",
  },
  etiquetas: { texto: "Nenhuma etiqueta criada ainda.", link: "Criar em Etiquetas", onde: "/configuracoes/etiquetas" },
  times: { texto: "Nenhum time criado ainda.", link: "Criar em Times", onde: "/configuracoes/times" },
}

/** A escolha que saiu da lista continua no campo, como "(não existe mais)", e não pelo id (B22-27). */
function comEscolhaApagada(itens: ItemSelecao[], valor: string): ItemSelecao[] {
  if (!valor || itens.some((i) => i.valor === valor)) return itens
  return [...itens, { valor, rotulo: NAO_EXISTE_MAIS, desabilitado: true }]
}

/** O que o motor ainda não executa aparece desabilitado, com "(em breve)". */
function itemDisponivel<T extends string>(valor: T, rotulo: string, disponiveis: readonly T[]): ItemSelecao {
  const disponivel = disponiveis.includes(valor)
  return { valor, rotulo: disponivel ? rotulo : `${rotulo} (em breve)`, desabilitado: !disponivel }
}

const ITENS_GATILHO = (Object.keys(GATILHOS) as GatilhoTipo[]).map((tipo) =>
  itemDisponivel(tipo, GATILHOS[tipo].rotulo, GATILHOS_DISPONIVEIS)
)
// B28-06: a ação removida não é oferecida; no bloco antigo que a tem, ela aparece desabilitada
const ITENS_ACAO = (Object.keys(ACOES) as AcaoTipo[])
  .filter((tipo) => !ACOES_REMOVIDAS.includes(tipo))
  .map((tipo) => itemDisponivel(tipo, ACOES[tipo].rotulo, ACOES_DISPONIVEIS))

function itensDaAcao(atual: AcaoTipo): ItemSelecao[] {
  if (!ACOES_REMOVIDAS.includes(atual)) return ITENS_ACAO
  return [...ITENS_ACAO, { valor: atual, rotulo: `${ACOES[atual].rotulo} (removida)`, desabilitado: true }]
}

const ITENS_REPETICAO: ItemSelecao[] = [
  { valor: "uma_vez_por_contato", rotulo: "Uma vez por contato" },
  { valor: "a_cada_horas", rotulo: "No máximo a cada N horas por contato" },
  { valor: "sempre", rotulo: "Sempre (a cada disparo)" },
]

/**
 * Horas de "no máximo a cada N horas" (B22-12). O texto fica como foi digitado,
 * para dar para apagar e escrever outro número; vazio vale 0. Fora de 1 a 8760,
 * ou com fração, o aviso aparece aqui e o Salvar recusa.
 */
function CampoHoras({ horas, onMudar }: { horas: number; onMudar: (horas: number) => void }) {
  const [texto, setTexto] = useState(String(horas))
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Input
          aria-label="Horas entre execuções"
          aria-invalid={!horasValidas(horas)}
          inputMode="numeric"
          className="w-24"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            const limpo = e.target.value.trim().replace(",", ".")
            const numero = Number(limpo)
            onMudar(limpo === "" || Number.isNaN(numero) ? 0 : numero)
          }}
        />
        <span className="text-sm text-muted-foreground">horas</span>
      </div>
      {!horasValidas(horas) && (
        <p className="text-xs text-erro">Use um número inteiro de 1 a {HORAS_MAXIMAS} horas.</p>
      )}
    </>
  )
}

/** Sobe o arquivo escolhido para o armazenamento (B11-07). O tipo e o limite são conferidos no servidor. */
export type GuardarArquivo = (
  dados: FormData
) => Promise<{ erro?: string; arquivo?: { url: string; nome: string; tipo: "imagem" | "documento" } }>

interface PainelBlocoProps {
  bloco: Bloco
  /** Gatilho do fluxo: decide se as verificações de mensagem valem. */
  gatilho: GatilhoTipo | undefined
  /** As condições deste bloco podem olhar a mensagem (B28-03)? Sem isto, vale só o gatilho. */
  haMensagem?: boolean
  /** Proteção de repetição da regra: fica no painel do gatilho (B22-09). */
  repeticao: Repeticao
  onMudarRepeticao: (repeticao: Repeticao) => void
  opcoes: OpcoesEditor
  pendencias: string[]
  guardarArquivo: GuardarArquivo
  onMudar: (bloco: Bloco) => void
  onRemover: () => void
  /** Cria uma cópia solta do bloco (B22-13). */
  onDuplicar: () => void
  onFechar: () => void
}

export function PainelBloco({
  bloco,
  gatilho,
  haMensagem,
  repeticao,
  onMudarRepeticao,
  opcoes,
  pendencias,
  guardarArquivo,
  onMudar,
  onRemover,
  onDuplicar,
  onFechar,
}: PainelBlocoProps) {
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
                onMudar={(valor) =>
                  onMudar({ ...bloco, gatilho: valor as GatilhoTipo, parametros: parametrosIniciaisDoGatilho(valor as GatilhoTipo) })
                }
              />
            </div>
            <CamposParametros
              campos={GATILHOS[bloco.gatilho].campos}
              parametros={bloco.parametros}
              opcoes={opcoes}
              onMudar={(parametros) => onMudar({ ...bloco, parametros })}
            />
            {REPETICAO_DISPONIVEL && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="painel-repeticao">Repetição para o mesmo contato</Label>
                <CampoSelecao
                  id="painel-repeticao"
                  valor={repeticao.modo}
                  itens={ITENS_REPETICAO}
                  onMudar={(valor) => {
                    const modo = valor as Repeticao["modo"]
                    onMudarRepeticao(modo === "a_cada_horas" ? { modo, horas: 24 } : { modo })
                  }}
                />
                {repeticao.modo === "a_cada_horas" && (
                  <CampoHoras
                    horas={repeticao.horas}
                    onMudar={(horas) => onMudarRepeticao({ modo: "a_cada_horas", horas })}
                  />
                )}
              </div>
            )}
          </>
        )}

        {bloco.tipo === "acao" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="painel-acao">Fazer</Label>
              <CampoSelecao
                id="painel-acao"
                valor={bloco.acao}
                itens={itensDaAcao(bloco.acao)}
                onMudar={(valor) => onMudar({ ...bloco, acao: valor as AcaoTipo, parametros: {} })}
              />
            </div>
            <CamposParametros
              campos={ACOES[bloco.acao].campos}
              parametros={bloco.parametros}
              opcoes={opcoes}
              guardarArquivo={guardarArquivo}
              onMudar={(parametros) => onMudar({ ...bloco, parametros })}
            />
            {bloco.acao === "mover_card" && bloco.parametros.funil === "recompra" && (
              <p className="rounded-lg bg-aviso-fundo px-3 py-2 text-xs text-aviso">
                Só move quem já tem card na Recompra. Um lead da Entrada ganha esse card quando chega em
                Ganho: para levá-lo à Recompra, mova para Ganho no Funil de Entrada.
              </p>
            )}
            {bloco.acao === "mover_card" && bloco.parametros.funil === "entrada" && (
              <p className="text-xs text-muted-foreground">
                Se o contato ainda não tem card na Entrada, ele é criado nesta etapa.
              </p>
            )}
          </>
        )}

        {bloco.tipo === "condicao" && (
          <EditorVerificacoes bloco={bloco} gatilho={gatilho} haMensagem={haMensagem} opcoes={opcoes} onMudar={onMudar} />
        )}

        {bloco.tipo === "espera" && <EditorEspera bloco={bloco} onMudar={onMudar} />}

        {pendencias.length > 0 && (
          <ul className="space-y-0.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {pendencias.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
      </div>

      {bloco.tipo !== "gatilho" && (
        <div className="grid grid-cols-2 gap-2 border-t p-4">
          <Button variant="outline" onClick={onDuplicar}>
            <Copy />
            Duplicar
          </Button>
          <Button variant="destructive" onClick={onRemover}>
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
  guardarArquivo,
  onMudar,
}: {
  campos: CampoTela[]
  parametros: Parametros
  opcoes: OpcoesEditor
  /** Só as ações têm campo de arquivo. */
  guardarArquivo?: GuardarArquivo
  onMudar: (parametros: Parametros) => void
}) {
  function mudar(chave: string, valor: string) {
    const novos = { ...parametros, [chave]: valor }
    // Trocar o funil ou o campo invalida a etapa ou o valor escolhidos antes
    if (chave === "funil") novos.etapa = ""
    if (chave === "campo") novos.valor = ""
    // B43-03: perfil que virou destino sai da origem
    if (chave === "destinos" && novos.origens) {
      novos.origens = itensDaLista(novos.origens).filter((id) => !itensDaLista(valor).includes(id)).join(",")
    }
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
            {campo.tipo === "arquivo" ? (
              <CampoArquivo
                id={id}
                parametros={parametros}
                guardarArquivo={guardarArquivo}
                onGuardado={(guardado) => onMudar({ ...parametros, ...guardado })}
              />
            ) : campo.tipo === "vencimento" ? (
              <CampoVencimento id={id} parametros={parametros} onMudar={(mudanca) => onMudar({ ...parametros, ...mudanca })} />
            ) : (
              <CampoParametro id={id} campo={campo} valor={valor} parametros={parametros} opcoes={opcoes} onMudar={mudar} />
            )}
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
      if (campo.variaveis) {
        return (
          <TextoComVariaveis
            id={id}
            valor={valor}
            placeholder={campo.placeholder}
            variaveis={variaveisDaAutomacao(opcoes)}
            onMudar={(novo) => onMudar(campo.chave, novo)}
          />
        )
      }
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
    case "opcoes_varias":
      return (
        <>
          <CampoVarias
            rotulo={campo.rotulo}
            valor={valor}
            opcoes={opcoesDaFonte(campo.fonte, opcoes)}
            desabilitadas={campo.fora ? itensDaLista(parametros[campo.fora]) : []}
            onMudar={(novo) => onMudar(campo.chave, novo)}
          />
          {campo.ajuda && <p className="text-xs text-muted-foreground">{campo.ajuda}</p>}
        </>
      )
    case "opcoes": {
      const lista = opcoesDaFonte(campo.fonte, opcoes)
      const semNada = LISTA_VAZIA[campo.fonte]
      // B22-34: lista da empresa vazia diz onde criar, em vez de um seletor sem opção
      if (lista.length === 0 && !valor && semNada) {
        return (
          <p className="rounded-md border border-dashed bg-card/60 px-3 py-2 text-xs text-muted-foreground">
            {semNada.texto}{" "}
            <a href={semNada.onde} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              {semNada.link}
            </a>
          </p>
        )
      }
      return (
        <CampoSelecao
          id={id}
          valor={valor}
          vazio={campo.vazio}
          itens={comEscolhaApagada(paraItens(lista), valor)}
          onMudar={(novo) => onMudar(campo.chave, novo)}
        />
      )
    }
    case "etapa":
      return (
        <CampoSelecao
          id={id}
          valor={valor}
          vazio={parametros.funil ? campo.vazio : "Escolha o funil primeiro"}
          itens={parametros.funil ? paraItens(etapasDoFunil(parametros.funil, opcoes)) : []}
          desabilitado={!parametros.funil}
          onMudar={(novo) => onMudar("etapa", novo)}
        />
      )
    case "valor_do_campo": {
      // B38-04: campo personalizado no controle do tipo
      const personalizado = campoPersonalizadoDoEditor(parametros.campo, opcoes)
      if (personalizado) {
        return <ValorDoCampoPersonalizado id={id} campo={personalizado} valor={valor} vazio={campo.vazio} onMudar={(novo) => onMudar("valor", novo)} />
      }
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
    case "tag_livre":
      return (
        <CampoTag
          id={id}
          valor={valor}
          tags={opcoes.tags}
          vazio={campo.vazio}
          onMudar={(novo) => onMudar(campo.chave, novo)}
        />
      )

    case "arquivo":
      // Desenhado por `CampoArquivo`, que sobe o arquivo e grava três parâmetros de uma vez
      return null
    case "vencimento":
      // Desenhado por `CampoVencimento`, que grava o número e a unidade
      return null
  }
}

const ITENS_UNIDADE_DO_VENCIMENTO: ItemSelecao[] = [
  { valor: "horas", rotulo: "horas depois" },
  { valor: "dias", rotulo: "dias depois" },
]

/**
 * Vencimento do lembrete (B28-01): um número e a unidade. Vazio ou 0 vence na
 * hora em que a regra roda. Fora do limite, o aviso aparece aqui e o Salvar recusa.
 */
function CampoVencimento({
  id,
  parametros,
  onMudar,
}: {
  id: string
  parametros: Parametros
  onMudar: (mudanca: Parametros) => void
}) {
  const valido = vencimentoDoLembrete(parametros) !== null
  return (
    <>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          aria-invalid={!valido}
          inputMode="numeric"
          className="w-20"
          placeholder="0"
          value={parametros.vence_em ?? ""}
          onChange={(e) => onMudar({ vence_em: e.target.value.trim() })}
        />
        <CampoSelecao
          aria-label="Unidade do vencimento"
          valor={parametros.vence_unidade || "dias"}
          itens={ITENS_UNIDADE_DO_VENCIMENTO}
          onMudar={(unidade) => onMudar({ vence_unidade: unidade })}
        />
      </div>
      {valido ? (
        <p className="text-xs text-muted-foreground">Vazio ou 0: vence na hora em que a regra roda.</p>
      ) : (
        <p className="text-xs text-destructive">Use um número inteiro, até 365 dias ou 8760 horas.</p>
      )}
    </>
  )
}

/**
 * Arquivo da ação "enviar imagem ou documento" (B11-07): sobe na hora em que o
 * admin escolhe, e a ação guarda o endereço, o nome original e o tipo.
 */
function CampoArquivo({
  id,
  parametros,
  guardarArquivo,
  onGuardado,
}: {
  id: string
  parametros: Parametros
  guardarArquivo?: GuardarArquivo
  onGuardado: (parametros: Parametros) => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function escolher(arquivo: File | undefined) {
    if (!arquivo || !guardarArquivo) return
    // B22-32: acima do limite, o Next recusa a requisição antes da action, com erro 500
    if (arquivo.size > LIMITE_DO_ARQUIVO) {
      setErro(ARQUIVO_GRANDE_DEMAIS)
      return
    }
    setErro(null)
    setEnviando(true)
    const dados = new FormData()
    dados.set("arquivo", arquivo)
    const resultado = await guardarArquivo(dados).catch(() => ({ erro: undefined, arquivo: undefined }))
    setEnviando(false)
    if (!resultado.arquivo) {
      setErro(resultado.erro ?? "Não foi possível enviar o arquivo. Tente de novo.")
      return
    }
    const { url, nome, tipo } = resultado.arquivo
    onGuardado({ arquivo: url, arquivo_nome: nome, arquivo_tipo: tipo })
  }

  return (
    <>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx"
        disabled={enviando}
        className="text-sm file:mr-2 file:rounded-md file:border file:bg-muted file:px-2 file:py-1 file:text-sm"
        onChange={(e) => escolher(e.target.files?.[0])}
      />
      {enviando && <p className="text-xs text-muted-foreground">Enviando o arquivo…</p>}
      {erro && <p className="text-xs text-erro">{erro}</p>}
      {!enviando && parametros.arquivo && (
        <p className="text-xs text-muted-foreground">
          {parametros.arquivo_tipo === "imagem" ? "Imagem" : "Documento"}: {parametros.arquivo_nome}
        </p>
      )}
      <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, ou PDF, Word e Excel. Até 4 MB.</p>
    </>
  )
}

function EditorVerificacoes({
  bloco,
  gatilho,
  haMensagem,
  opcoes,
  onMudar,
}: {
  bloco: BlocoCondicao
  gatilho: GatilhoTipo | undefined
  haMensagem?: boolean
  opcoes: OpcoesEditor
  onMudar: (bloco: Bloco) => void
}) {
  // B28-03: depois de uma saída de mensagem da espera, há mensagem em qualquer gatilho
  const deMensagem = haMensagem ?? (gatilho ? GATILHOS_DE_MENSAGEM.includes(gatilho) : false)

  const itensAtributo: ItemSelecao[] = (Object.keys(VERIFICACOES) as VerificacaoTipo[]).map((tipo) => {
    const item = itemDisponivel(tipo, VERIFICACOES[tipo].rotulo, VERIFICACOES_DISPONIVEIS)
    const soEmMensagem = VERIFICACOES_DE_MENSAGEM.includes(tipo) && !deMensagem
    if (item.desabilitado || !soEmMensagem) return item
    return { ...item, rotulo: `${item.rotulo} (só em gatilhos de mensagem)`, desabilitado: true }
  })

  function mudarVerificacoes(verificacoes: Verificacao[]) {
    onMudar({ ...bloco, verificacoes })
  }

  function mudar(id: string, mudanca: Partial<Verificacao>) {
    mudarVerificacoes(bloco.verificacoes.map((v) => (v.id === id ? { ...v, ...mudanca } : v)))
  }

  function adicionar() {
    // A primeira verificação que o motor executa e que vale para o gatilho
    const tipo =
      VERIFICACOES_DISPONIVEIS.find((t) => deMensagem || !VERIFICACOES_DE_MENSAGEM.includes(t)) ??
      VERIFICACOES_DISPONIVEIS[0]
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
                // B38-04: o campo personalizado escolhe o campo antes da comparação
                mudar(v.id, { tipo, operador: VERIFICACOES[tipo].operadores[0]?.id ?? "", valor: "", campo: undefined })
              }}
            />
            {invalida && (
              <p className="text-xs text-erro">Não vale para este gatilho. Remova ou troque a verificação.</p>
            )}
            {v.tipo === "campo_personalizado" ? (
              <CondicaoDeCampoPersonalizado verificacao={v} opcoes={opcoes} onMudar={(mudanca) => mudar(v.id, mudanca)} />
            ) : (
              <CampoSelecao
                aria-label="Operador"
                valor={v.operador}
                itens={paraItens(item.operadores)}
                onMudar={(operador) => mudar(v.id, { operador })}
              />
            )}
            {v.tipo === "horario_comercial" && (
              <p className="text-xs text-muted-foreground">
                Horário comercial: {descreverHorario(opcoes.horarioComercial)}. Para mudar, use o botão
                &quot;Horário comercial&quot; na lista de automações.
              </p>
            )}
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
                itens={comEscolhaApagada(paraItens(opcoesDaFonte(item.valor.fonte, opcoes)), v.valor)}
                onMudar={(valor) => mudar(v.id, { valor })}
              />
            )}
            {pedeValor && item.valor.tipo === "opcoes_varias" && (
              <CampoVarias
                rotulo="Valor"
                valor={v.valor}
                opcoes={opcoesDaFonte(item.valor.fonte, opcoes)}
                onMudar={(valor) => mudar(v.id, { valor })}
              />
            )}
            {pedeValor && item.valor.tipo === "tag_livre" && (
              <CampoTag
                aria-label="Valor"
                valor={v.valor}
                tags={opcoes.tags}
                onMudar={(valor) => mudar(v.id, { valor })}
              />
            )}
            {pedeValor && item.valor.tipo === "funil_etapa" && (
              <SeletorFunilEtapa valor={v.valor} opcoes={opcoes} onMudar={(valor) => mudar(v.id, { valor })} />
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

const ITENS_UNIDADE_DA_ESPERA: ItemSelecao[] = [
  { valor: "segundos", rotulo: "segundos" },
  { valor: "minutos", rotulo: "minutos" },
  { valor: "horas", rotulo: "horas" },
  { valor: "dias", rotulo: "dias" },
]

const OPCOES_DA_ESPERA: Array<{ saida: SaidaDaEspera; rotulo: string }> = [
  { saida: "tempo", rotulo: "Passar um tempo" },
  { saida: "recebeu_mensagem", rotulo: "O contato mandar mensagem" },
  { saida: "atendente_enviou", rotulo: "Alguém do time mandar mensagem" },
]

/**
 * Painel do bloco "esperar" (B28-02): cada opção ligada vira uma saída, e a que
 * acontecer primeiro leva o contato. A última opção ligada não desliga (CA-B28-03).
 * As de mensagem aparecem como "em breve" até o motor esperá-las (B28-03).
 */
function EditorEspera({ bloco, onMudar }: { bloco: BlocoEspera; onMudar: (bloco: Bloco) => void }) {
  const [semOpcao, setSemOpcao] = useState(false)
  const ligadas = saidasDaEspera(bloco)

  function alternar(saida: SaidaDaEspera, ligar: boolean) {
    if (!ligar && ligadas.length === 1 && ligadas[0] === saida) {
      setSemOpcao(true)
      return
    }
    setSemOpcao(false)
    if (saida === "tempo") onMudar({ ...bloco, tempo: ligar ? { quantidade: "1", unidade: "dias" } : null })
    if (saida === "recebeu_mensagem") onMudar({ ...bloco, recebeuMensagem: ligar })
    if (saida === "atendente_enviou") onMudar({ ...bloco, atendenteEnviou: ligar })
  }

  const tempoValido = duracaoDaEspera(bloco.tempo) !== null
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        O contato fica parado aqui até a primeira destas coisas acontecer. Cada opção ligada é uma saída do bloco.
      </p>
      {OPCOES_DA_ESPERA.map(({ saida, rotulo }) => {
        const ligada = ligadas.includes(saida)
        const disponivel = OPCOES_DE_ESPERA_DISPONIVEIS.includes(saida)
        return (
          <div key={saida} className="flex flex-col gap-2">
            <label className={cn("flex items-center gap-2 text-sm", !disponivel && !ligada && "opacity-50")}>
              <input
                type="checkbox"
                className="size-4 shrink-0 accent-primary"
                checked={ligada}
                disabled={!disponivel && !ligada}
                onChange={(e) => alternar(saida, e.target.checked)}
              />
              <span className="flex-1">{rotulo}</span>
              {!disponivel && <span className="text-xs text-muted-foreground">em breve</span>}
            </label>
            {saida === "tempo" && bloco.tempo && (
              <>
                <div className="flex items-center gap-1.5 pl-6">
                  <Input
                    aria-label="Quanto tempo"
                    aria-invalid={!tempoValido}
                    inputMode="numeric"
                    className="w-20"
                    value={bloco.tempo.quantidade}
                    onChange={(e) => onMudar({ ...bloco, tempo: { ...bloco.tempo!, quantidade: e.target.value.trim() } })}
                  />
                  <CampoSelecao
                    aria-label="Unidade do tempo"
                    valor={bloco.tempo.unidade}
                    itens={ITENS_UNIDADE_DA_ESPERA}
                    onMudar={(unidade) =>
                      onMudar({ ...bloco, tempo: { ...bloco.tempo!, unidade: unidade as UnidadeDaEspera } })
                    }
                  />
                </div>
                {!tempoValido && (
                  <p className="pl-6 text-xs text-destructive">Use um número inteiro, de 1 até 365 dias.</p>
                )}
              </>
            )}
          </div>
        )
      })}
      {/* B28-03: sem o tempo, até quando o contato espera a mensagem */}
      {!bloco.tempo && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="painel-limite-espera">Sem o tempo, esperar</Label>
          <CampoSelecao
            id="painel-limite-espera"
            valor={bloco.limite}
            itens={ITENS_LIMITE_DA_ESPERA}
            onMudar={(limite) => onMudar({ ...bloco, limite: limite as BlocoEspera["limite"] })}
          />
          <p className="text-xs text-muted-foreground">
            {bloco.limite === "30_dias"
              ? "Passados 30 dias sem mensagem, a espera expira e o contato não segue."
              : "O contato fica esperando até a mensagem chegar."}
          </p>
        </div>
      )}
      {semOpcao && (
        <p role="alert" className="text-xs text-destructive">
          {ESPERA_SEM_OPCAO}.
        </p>
      )}
    </div>
  )
}

const ITENS_LIMITE_DA_ESPERA: ItemSelecao[] = [
  { valor: "30_dias", rotulo: "No máximo 30 dias" },
  { valor: "sem_limite", rotulo: "Sem limite" },
]

/** Valor no formato `funil:etapa`. Só fica completo com os dois escolhidos. */
// ─── B38-04: campos personalizados ───────────────────────────────────────────

/** Em texto, o valor inteiro (pode ter vírgula); nos outros tipos, a lista separada por vírgula. */
const VALOR_EM_LISTA = ["lista", "multipla", "numero", "dinheiro", "data"]

const SIM_NAO_DO_EDITOR: Opcao[] = [
  { id: "sim", nome: "Sim" },
  { id: "nao", nome: "Não" },
]

/** O controle de um valor da condição de campo personalizado: número, data, opções ou texto. */
function EntradaDoValor({
  rotulo,
  campo,
  valor,
  dias,
  onMudar,
}: {
  rotulo: string
  campo: CampoParaFiltro
  valor: string
  dias?: boolean
  onMudar: (valor: string) => void
}) {
  if (dias) {
    return <Input aria-label={rotulo} type="number" min={1} value={valor} onChange={(e) => onMudar(e.target.value)} />
  }
  if (campo.tipo === "numero" || campo.tipo === "dinheiro") {
    return <Input aria-label={rotulo} type="number" step="0.01" inputMode="decimal" value={valor} onChange={(e) => onMudar(e.target.value)} />
  }
  if (campo.tipo === "data") {
    return <Input aria-label={rotulo} type="date" value={valor} onChange={(e) => onMudar(e.target.value)} />
  }
  const lista = campo.tipo === "sim_nao" ? SIM_NAO_DO_EDITOR : campo.tipo === "lista" || campo.tipo === "multipla" ? campo.opcoes : null
  if (lista) {
    return <CampoSelecao aria-label={rotulo} valor={valor} vazio="Escolha…" itens={comEscolhaApagada(paraItens(lista), valor)} onMudar={onMudar} />
  }
  return <Input aria-label={rotulo} value={valor} onChange={(e) => onMudar(e.target.value)} />
}

/** A condição "campo personalizado": o campo, a comparação do tipo e o valor (as do filtro). */
function CondicaoDeCampoPersonalizado({
  verificacao: v,
  opcoes,
  onMudar,
}: {
  verificacao: Verificacao
  opcoes: OpcoesEditor
  onMudar: (mudanca: Partial<Verificacao>) => void
}) {
  const campos = opcoes.camposPersonalizados ?? []
  const campo = campoPersonalizadoDoEditor(v.campo, opcoes)
  const doFiltro = v.campo ? campoDoFiltro(v.campo, undefined, campos) : undefined
  const comparacoes = doFiltro ? comparacoesDoCampo(doFiltro) : []
  const forma = v.operador ? valoresPedidos(v.operador as Comparacao) : "nenhum"
  const emLista = !!campo && VALOR_EM_LISTA.includes(campo.tipo)
  const valores = emLista ? itensDaLista(v.valor) : [v.valor]
  const dias = v.operador === "ultimos_dias" || v.operador === "ha_mais_de_dias"
  const mudarValor = (posicao: number, novo: string) => {
    const proximos = [...valores]
    proximos[posicao] = novo
    onMudar({ valor: emLista ? proximos.map((x) => (x ?? "").trim()).join(",") : novo })
  }

  return (
    <>
      <CampoSelecao
        aria-label="Campo"
        valor={v.campo ?? ""}
        vazio="Escolha o campo…"
        itens={comEscolhaApagada(campos.map((c) => ({ valor: campoPersonalizado(c), rotulo: c.nome })), v.campo ?? "")}
        onMudar={(novo) => {
          const escolhido = campoDoFiltro(novo, undefined, campos)
          onMudar({ campo: novo, operador: escolhido ? comparacoesDoCampo(escolhido)[0] : "", valor: "" })
        }}
      />
      {doFiltro && (
        <CampoSelecao
          aria-label="Operador"
          valor={v.operador}
          itens={comparacoes.map((c) => ({ valor: c, rotulo: rotuloDaComparacao(doFiltro, c) }))}
          onMudar={(operador) => onMudar({ operador, valor: "" })}
        />
      )}
      {campo && forma === "varios" && (
        <CampoVarias rotulo="Valor" valor={v.valor} opcoes={campo.opcoes} onMudar={(valor) => onMudar({ valor })} />
      )}
      {campo && forma === "um" && (
        <EntradaDoValor rotulo="Valor" campo={campo} valor={valores[0] ?? ""} dias={dias} onMudar={(novo) => mudarValor(0, novo)} />
      )}
      {campo && forma === "dois" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <EntradaDoValor rotulo="Valor" campo={campo} valor={valores[0] ?? ""} onMudar={(novo) => mudarValor(0, novo)} />
          e
          <EntradaDoValor rotulo="Até" campo={campo} valor={valores[1] ?? ""} onMudar={(novo) => mudarValor(1, novo)} />
        </div>
      )}
    </>
  )
}

/**
 * O valor do gatilho e da ação de campo personalizado, no controle do tipo. O valor
 * fora do formato aparece apontado embaixo (CA-B38-40); o servidor também recusa.
 */
function ValorDoCampoPersonalizado({
  id,
  campo,
  valor,
  vazio,
  onMudar,
}: {
  id: string
  campo: CampoParaFiltro
  valor: string
  vazio?: string
  onMudar: (valor: string) => void
}) {
  const doCampo = { tipo: campo.tipo as TipoDeCampo, opcoes: campo.opcoes }
  const conferido = valor ? conferirValor(doCampo, entradaDoCanonico(doCampo.tipo, valor)) : null
  const erro = conferido && "erro" in conferido ? conferido.erro : null
  let controle: React.ReactNode
  if (campo.tipo === "multipla") {
    controle = <CampoVarias rotulo="Valor" valor={valor} opcoes={campo.opcoes} onMudar={onMudar} />
  } else if (campo.tipo === "lista" || campo.tipo === "sim_nao") {
    const lista = campo.tipo === "lista" ? campo.opcoes : SIM_NAO_DO_EDITOR
    controle = <CampoSelecao id={id} valor={valor} vazio={vazio} itens={comEscolhaApagada(paraItens(lista), valor)} onMudar={onMudar} />
  } else {
    const tipo = campo.tipo === "data" ? "date" : campo.tipo === "numero" || campo.tipo === "dinheiro" ? "number" : "text"
    controle = (
      <Input
        id={id}
        type={tipo}
        step={tipo === "number" ? "0.01" : undefined}
        value={valor}
        aria-invalid={erro ? true : undefined}
        onChange={(e) => onMudar(e.target.value)}
      />
    )
  }
  return (
    <>
      {controle}
      {erro && <p className="text-xs text-erro">{erro}</p>}
    </>
  )
}

function SeletorFunilEtapa({ valor, opcoes, onMudar }: { valor: string; opcoes: OpcoesEditor; onMudar: (valor: string) => void }) {
  const [funil = "", etapa = ""] = valor.split(":")
  return (
    <div className="grid grid-cols-2 gap-2">
      <CampoSelecao
        aria-label="Funil"
        valor={funil}
        vazio="Funil…"
        itens={paraItens(funisDoEditor(opcoes))}
        onMudar={(novo) => onMudar(novo ? `${novo}:` : "")}
      />
      <CampoSelecao
        aria-label="Etapa"
        valor={etapa}
        vazio="Etapa…"
        itens={funil ? paraItens(etapasDoFunil(funil, opcoes)) : []}
        desabilitado={!funil}
        onMudar={(novo) => onMudar(`${funil}:${novo}`)}
      />
    </div>
  )
}

/**
 * Tag digitada, que pode ser nova, com as tags que a empresa já usa como
 * sugestão. Serve à ação "adicionar tag" e à condição "tag do contato".
 */
function CampoTag({
  id,
  "aria-label": rotuloAcessivel,
  valor,
  tags,
  vazio,
  onMudar,
}: {
  id?: string
  "aria-label"?: string
  valor: string
  tags: Opcao[]
  /** Quando o campo pode ficar em branco (no gatilho, "qualquer tag"). */
  vazio?: string
  onMudar: (valor: string) => void
}) {
  // As que combinam com o que foi digitado
  const sugestoes = tags.filter((t) => t.id !== valor && t.id.includes(valor)).slice(0, 12)
  // B22-34: o espaço digitado some, e a tela diz por quê
  const [tirouEspaco, setTirouEspaco] = useState(false)
  return (
    <>
      <Input
        id={id}
        aria-label={rotuloAcessivel}
        value={valor}
        maxLength={50}
        placeholder={vazio ?? "ex.: interessado"}
        // Como a tela do contato grava: minúsculas e sem espaço
        onChange={(e) => {
          setTirouEspaco(/\s/.test(e.target.value))
          onMudar(e.target.value.toLowerCase().replace(/\s/g, ""))
        }}
      />
      {sugestoes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {sugestoes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onMudar(t.id)}
              className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t.nome}
            </button>
          ))}
        </div>
      )}
      {tirouEspaco && (
        <p className="text-xs text-aviso">Tag não tem espaço: o espaço foi tirado. Use hífen para separar (ex.: cliente-vip).</p>
      )}
      <p className="text-xs text-muted-foreground">
        {vazio ? `Em branco: ${vazio.toLowerCase()}. ` : ""}Pode ser uma tag nova. Minúsculas e sem espaço.
      </p>
    </>
  )
}
