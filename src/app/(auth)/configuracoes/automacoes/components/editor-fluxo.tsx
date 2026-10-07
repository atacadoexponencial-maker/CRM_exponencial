"use client"

// Editor de fluxo de uma automação: canvas com os blocos ligados, painel do
// bloco selecionado, simulação com um contato e salvar. Quem grava, quem busca
// contatos e quem simula vêm por parâmetro: as actions do servidor (B11-10).

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from "@xyflow/react"
import { ArrowLeft, FlaskConical, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  REPETICAO_DISPONIVEL,
  formaLaco,
  gatilhoDoFluxo,
  pendenciasDoFluxo,
  respondeTodaMensagem,
  type Bloco,
  type Fluxo,
  type Repeticao,
  type ResultadoSimulacao,
  type Saida,
} from "@/lib/fluxo-automacao"
import type { OpcoesEditor } from "./catalogo"
import {
  ContextoEditorFluxo,
  TIPOS_DE_BLOCO,
  TIPOS_DE_LIGACAO,
  type LigacaoFluxo,
  type NoFluxo,
} from "./blocos-fluxo"
import { CampoSelecao, type ItemSelecao } from "./campo-selecao"
import { MenuNovoBloco, type ItemNovoBloco } from "./menu-novo-bloco"
import { PainelBloco } from "./painel-bloco"

export interface RegraEditada {
  nome: string
  repeticao: Repeticao
  fluxo: Fluxo
}

export interface ContatoTeste {
  id: string
  nome: string
  /** O que ajuda a escolher entre contatos de mesmo nome, como o telefone. */
  descricao: string
}

interface EditorFluxoProps {
  regraInicial: RegraEditada
  opcoes: OpcoesEditor
  /** Busca por nome ou telefone; texto vazio traz os contatos que conversaram por último. */
  buscarContatos: (texto: string) => Promise<ContatoTeste[]>
  salvar: (regra: RegraEditada) => Promise<{ erro?: string; aviso?: string }>
  simular: (contatoId: string, fluxo: Fluxo) => Promise<{ erro?: string; resultado?: ResultadoSimulacao }>
  onVoltar: () => void
  /** Aviso que o editor já mostra ao abrir, como "Automação salva" logo depois do primeiro salvamento. */
  avisoInicial?: string
}

const ITENS_REPETICAO: ItemSelecao[] = [
  { valor: "uma_vez_por_contato", rotulo: "Uma vez por contato" },
  { valor: "a_cada_horas", rotulo: "No máximo a cada N horas por contato" },
  { valor: "sempre", rotulo: "Sempre (a cada disparo)" },
]

// Distância do bloco novo até o bloco de onde ele sai
const ESPACO_VERTICAL = 90
const DESVIO_LATERAL = 170

// Tamanho usado para achar espaço livre antes de o bloco novo ser medido
const LARGURA_BLOCO = 256
const ALTURA_BLOCO = 120

const saidaDa = (sourceHandle: string | null | undefined) => (sourceHandle ?? "proximo") as Saida

/** Desce a posição até não cobrir nenhum bloco existente. */
function posicaoLivre(inicial: { x: number; y: number }, nos: NoFluxo[]): { x: number; y: number } {
  const posicao = { ...inicial }
  const cobre = (n: NoFluxo) => {
    const largura = n.measured?.width ?? LARGURA_BLOCO
    const altura = n.measured?.height ?? ALTURA_BLOCO
    return (
      posicao.x < n.position.x + largura &&
      posicao.x + LARGURA_BLOCO > n.position.x &&
      posicao.y < n.position.y + altura &&
      posicao.y + ALTURA_BLOCO > n.position.y
    )
  }
  for (let tentativa = 0; tentativa < 30 && nos.some(cobre); tentativa++) posicao.y += 40
  return posicao
}

function novaLigacao(de: string, saida: Saida, para: string): LigacaoFluxo {
  return {
    // Uma ligação por saída: o id da saída identifica a ligação
    id: `${de}:${saida}`,
    source: de,
    sourceHandle: saida,
    target: para,
    type: "ligacao",
    markerEnd: { type: MarkerType.ArrowClosed },
  }
}

function paraNos(fluxo: Fluxo): NoFluxo[] {
  return fluxo.blocos.map((bloco) => ({
    id: bloco.id,
    type: bloco.tipo,
    position: bloco.posicao,
    data: { bloco },
    deletable: bloco.tipo !== "gatilho",
  }))
}

function paraFluxo(nos: NoFluxo[], ligacoes: LigacaoFluxo[]): Fluxo {
  return {
    blocos: nos.map((n) => ({ ...n.data.bloco, posicao: n.position })),
    ligacoes: ligacoes.map((l) => ({ de: l.source, saida: saidaDa(l.sourceHandle), para: l.target })),
  }
}

export function EditorFluxo(props: EditorFluxoProps) {
  return (
    <ReactFlowProvider>
      <EditorFluxoInterno {...props} />
    </ReactFlowProvider>
  )
}

function EditorFluxoInterno({
  regraInicial,
  opcoes,
  buscarContatos,
  salvar,
  simular,
  onVoltar,
  avisoInicial,
}: EditorFluxoProps) {
  const [nos, setNos, onNodesChange] = useNodesState<NoFluxo>(paraNos(regraInicial.fluxo))
  const [ligacoes, setLigacoes, onEdgesChange] = useEdgesState<LigacaoFluxo>(
    regraInicial.fluxo.ligacoes.map((l) => novaLigacao(l.de, l.saida, l.para))
  )
  const [nome, setNome] = useState(regraInicial.nome)
  const [repeticao, setRepeticao] = useState<Repeticao>(regraInicial.repeticao)

  const [menu, setMenu] = useState<{ de: string; saida: Saida } | "solto" | null>(null)
  const [dialogTeste, setDialogTeste] = useState(false)
  const [simulacao, setSimulacao] = useState<{ contato: ContatoTeste; resultado: ResultadoSimulacao } | null>(null)
  const [avisoRepeticao, setAvisoRepeticao] = useState(false)
  const [destacarErros, setDestacarErros] = useState(false)
  const [erroNome, setErroNome] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(
    avisoInicial ? { tipo: "ok", texto: avisoInicial } : null
  )
  const [salvando, setSalvando] = useState(false)

  const areaRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, deleteElements } = useReactFlow<NoFluxo, LigacaoFluxo>()

  const fluxo = useMemo(() => paraFluxo(nos, ligacoes), [nos, ligacoes])
  const pendencias = useMemo(() => pendenciasDoFluxo(fluxo), [fluxo])
  const selecionado = nos.find((n) => n.selected)

  const contexto = useMemo(
    () => ({
      opcoes,
      pendencias: pendencias.porBloco,
      destacarErros,
      simulacao: simulacao?.resultado ?? null,
      aoAdicionar: (de: string, saida: Saida) => setMenu({ de, saida }),
    }),
    [opcoes, pendencias, destacarErros, simulacao]
  )

  // Ligar uma saída que já tinha seta troca a ligação antiga pela nova
  const onConnect = useCallback(
    (c: Connection) => {
      const saida = saidaDa(c.sourceHandle)
      setLigacoes((atuais) => [
        ...atuais.filter((l) => !(l.source === c.source && saidaDa(l.sourceHandle) === saida)),
        novaLigacao(c.source, saida, c.target),
      ])
    },
    [setLigacoes]
  )

  // Recusa a ligação que faria o caminho voltar a um bloco anterior (ou ao próprio bloco)
  const ligacaoValida = useCallback(
    (c: Connection | LigacaoFluxo) => {
      const saida = saidaDa(c.sourceHandle)
      const restantes = fluxo.ligacoes.filter((l) => !(l.de === c.source && l.saida === saida))
      return !formaLaco(restantes, c.source, c.target)
    },
    [fluxo.ligacoes]
  )

  function adicionarBloco(item: ItemNovoBloco) {
    const id = crypto.randomUUID()
    const origem = menu && menu !== "solto" ? nos.find((n) => n.id === menu.de) : undefined
    let posicao
    if (origem && menu && menu !== "solto") {
      const desvio = menu.saida === "sim" ? -DESVIO_LATERAL : menu.saida === "nao" ? DESVIO_LATERAL : 0
      posicao = {
        x: origem.position.x + desvio,
        y: origem.position.y + (origem.measured?.height ?? ALTURA_BLOCO) + ESPACO_VERTICAL,
      }
    } else {
      const area = areaRef.current?.getBoundingClientRect()
      posicao = screenToFlowPosition({
        x: area ? area.left + area.width / 2 - LARGURA_BLOCO / 2 : 200,
        y: area ? area.top + area.height / 3 : 200,
      })
    }
    posicao = posicaoLivre(posicao, nos)

    const bloco: Bloco =
      item === "condicao"
        ? { id, tipo: "condicao", verificacoes: [], posicao }
        : { id, tipo: "acao", acao: item, parametros: {}, posicao }

    setNos((atuais) => [
      ...atuais.map((n) => ({ ...n, selected: false })),
      { id, type: bloco.tipo, position: posicao, data: { bloco }, selected: true },
    ])
    if (origem && menu && menu !== "solto") {
      const { saida } = menu
      setLigacoes((atuais) => [
        ...atuais.filter((l) => !(l.source === origem.id && saidaDa(l.sourceHandle) === saida)),
        novaLigacao(origem.id, saida, id),
      ])
    }
    setMenu(null)
  }

  function mudarBloco(bloco: Bloco) {
    setNos((atuais) => atuais.map((n) => (n.id === bloco.id ? { ...n, data: { bloco } } : n)))
  }

  function fecharPainel() {
    setNos((atuais) => atuais.map((n) => ({ ...n, selected: false })))
  }

  async function testar(contato: ContatoTeste) {
    setDialogTeste(false)
    setMensagem(null)
    const { erro, resultado } = await simular(contato.id, fluxo)
    if (erro || !resultado) {
      setSimulacao(null)
      setMensagem({ tipo: "erro", texto: erro ?? "Não foi possível testar agora." })
      return
    }
    setSimulacao({ contato, resultado })
  }

  async function tentarSalvar(aceitouAviso = false) {
    setMensagem(null)
    const nomeOk = nome.trim() !== ""
    const blocosComProblema = Object.keys(pendencias.porBloco).length
    setErroNome(!nomeOk)

    if (!nomeOk || blocosComProblema > 0 || pendencias.gerais.length > 0) {
      setDestacarErros(true)
      const partes: string[] = []
      if (!nomeOk) partes.push("Dê um nome à automação")
      if (blocosComProblema > 0) {
        partes.push(blocosComProblema === 1 ? "Corrija o bloco marcado" : `Corrija os ${blocosComProblema} blocos marcados`)
      }
      partes.push(...pendencias.gerais)
      setMensagem({ tipo: "erro", texto: partes.join(". ") })
      return
    }

    if (!aceitouAviso && respondeTodaMensagem(fluxo, repeticao)) {
      setAvisoRepeticao(true)
      return
    }
    setAvisoRepeticao(false)

    setSalvando(true)
    const resultado = await salvar({ nome: nome.trim(), repeticao, fluxo })
    setSalvando(false)
    setMensagem(
      resultado.erro ? { tipo: "erro", texto: resultado.erro } : { tipo: "ok", texto: resultado.aviso ?? "Automação salva" }
    )
  }

  const acoesNoCaminho = simulacao
    ? simulacao.resultado.blocos.filter((id) => fluxo.blocos.find((b) => b.id === id)?.tipo === "acao").length
    : 0

  return (
    <div className="flex min-h-[560px] flex-1 flex-col">
      {/* Barra do topo */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="sm" onClick={onVoltar}>
          <ArrowLeft />
          Automações
        </Button>
        <Input
          aria-label="Nome da automação"
          aria-invalid={erroNome}
          placeholder="Nome da automação"
          className="h-8 w-full sm:w-64"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value)
            if (e.target.value.trim()) setErroNome(false)
          }}
        />
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {REPETICAO_DISPONIVEL ? (
            <CampoSelecao
              aria-label="Proteção de repetição"
              className="w-auto min-w-0 max-w-full"
              valor={repeticao.modo}
              itens={ITENS_REPETICAO}
              onMudar={(valor) => {
                const modo = valor as Repeticao["modo"]
                setRepeticao(modo === "a_cada_horas" ? { modo, horas: 24 } : { modo })
              }}
            />
          ) : (
            <span className="text-xs text-muted-foreground" title="Chega com o histórico de execuções">
              Proteção de repetição: em breve
            </span>
          )}
          {REPETICAO_DISPONIVEL && repeticao.modo === "a_cada_horas" && (
            <>
              <Input
                aria-label="Horas entre execuções"
                type="number"
                min={1}
                className="h-8 w-20"
                value={repeticao.horas}
                onChange={(e) => setRepeticao({ modo: "a_cada_horas", horas: Math.max(1, Number(e.target.value) || 1) })}
              />
              <span className="text-sm text-muted-foreground">horas</span>
            </>
          )}
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Button variant="outline" size="sm" onClick={() => setMenu("solto")}>
            <Plus />
            <span className="hidden md:inline">Adicionar bloco</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDialogTeste(true)}>
            <FlaskConical />
            <span className="hidden md:inline">Testar com um contato</span>
            <span className="md:hidden">Testar</span>
          </Button>
          <Button size="sm" onClick={() => tentarSalvar()} disabled={salvando}>
            Salvar
          </Button>
        </div>
      </div>

      {/* Canvas. Os avisos ficam por cima dele, para o desenho não pular quando aparecem. */}
      <div ref={areaRef} className="relative min-h-0 flex-1">
        <ContextoEditorFluxo.Provider value={contexto}>
          <ReactFlow
            nodes={nos}
            edges={ligacoes}
            nodeTypes={TIPOS_DE_BLOCO}
            edgeTypes={TIPOS_DE_LIGACAO}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={ligacaoValida}
            deleteKeyCode={["Backspace", "Delete"]}
            colorMode="dark"
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.3}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
            {(mensagem || simulacao) && (
              <Panel position="top-center" className="flex max-w-[90vw] flex-col items-center gap-2">
                {mensagem && (
                  <div
                    role={mensagem.tipo === "erro" ? "alert" : "status"}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-sm",
                      mensagem.tipo === "erro"
                        ? "border-destructive/50 bg-background text-destructive"
                        : "border-emerald-500/40 bg-background text-emerald-300"
                    )}
                  >
                    <span>{mensagem.texto}</span>
                    <Button variant="ghost" size="icon-xs" aria-label="Fechar aviso" onClick={() => setMensagem(null)}>
                      <X />
                    </Button>
                  </div>
                )}
                {simulacao && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-500/40 bg-background px-3 py-2 text-sm text-emerald-300 shadow-sm">
                    <span>
                      <strong>Simulação para {simulacao.contato.nome}:</strong>{" "}
                      {acoesNoCaminho === 0
                        ? "nenhuma ação seria feita para este contato."
                        : `${acoesNoCaminho} ${acoesNoCaminho === 1 ? "ação seria feita" : "ações seriam feitas"}.`}{" "}
                      Nada foi executado.
                    </span>
                    <Button variant="outline" size="xs" onClick={() => setSimulacao(null)}>
                      Limpar
                    </Button>
                  </div>
                )}
              </Panel>
            )}
          </ReactFlow>
        </ContextoEditorFluxo.Provider>

        {selecionado && (
          <PainelBloco
            key={selecionado.id}
            bloco={selecionado.data.bloco}
            gatilho={gatilhoDoFluxo(fluxo)?.gatilho}
            opcoes={opcoes}
            pendencias={pendencias.porBloco[selecionado.id] ?? []}
            onMudar={mudarBloco}
            onRemover={() => deleteElements({ nodes: [{ id: selecionado.id }] })}
            onFechar={fecharPainel}
          />
        )}
      </div>

      <MenuNovoBloco
        aberto={menu !== null}
        saida={menu && menu !== "solto" ? menu.saida : null}
        onFechar={() => setMenu(null)}
        onEscolher={adicionarBloco}
      />

      {/* Testar com um contato */}
      <Dialog open={dialogTeste} onOpenChange={setDialogTeste}>
        <DialogPopup className="max-w-md">
          <DialogTitle>Testar com um contato</DialogTitle>
          <DialogDescription className="mb-4">
            Mostra no canvas o caminho que o contato percorreria, com os dados de agora. Nada é executado.
          </DialogDescription>
          {dialogTeste && <BuscaContatoTeste buscarContatos={buscarContatos} onEscolher={testar} />}
        </DialogPopup>
      </Dialog>

      {/* Aviso: regra que responde toda mensagem */}
      <Dialog open={avisoRepeticao} onOpenChange={setAvisoRepeticao}>
        <DialogPopup className="max-w-md">
          <DialogTitle className="mb-2">Esta regra vai responder toda mensagem deste contato</DialogTitle>
          <DialogDescription className="mb-4">
            O gatilho é &quot;mensagem recebida&quot;, o caminho envia mensagem e a repetição está em
            &quot;sempre&quot;. Cada mensagem do cliente gera uma resposta nova. Para evitar, escolha &quot;uma
            vez por contato&quot; ou &quot;no máximo a cada N horas&quot;.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" />}>Voltar</DialogClose>
            <Button onClick={() => tentarSalvar(true)} disabled={salvando}>
              Salvar assim mesmo
            </Button>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  )
}

/** Busca e lista de contatos do "Testar com um contato". */
function BuscaContatoTeste({
  buscarContatos,
  onEscolher,
}: {
  buscarContatos: EditorFluxoProps["buscarContatos"]
  onEscolher: (contato: ContatoTeste) => void
}) {
  const [texto, setTexto] = useState("")
  const [contatos, setContatos] = useState<ContatoTeste[] | null>(null)

  // Espera a pessoa parar de digitar antes de buscar; resposta velha é descartada
  useEffect(() => {
    let descartar = false
    const espera = setTimeout(
      async () => {
        const encontrados = await buscarContatos(texto)
        if (!descartar) setContatos(encontrados)
      },
      texto ? 300 : 0
    )
    return () => {
      descartar = true
      clearTimeout(espera)
    }
  }, [texto, buscarContatos])

  return (
    <div className="flex flex-col gap-2">
      <Input
        autoFocus
        aria-label="Buscar contato"
        placeholder="Nome ou telefone"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto">
        {contatos === null ? (
          <p className="px-1 text-sm text-muted-foreground">Buscando…</p>
        ) : contatos.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">Nenhum contato encontrado.</p>
        ) : (
          contatos.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onEscolher(c)}
              className="rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="block text-sm font-medium">{c.nome}</span>
              <span className="block text-xs text-muted-foreground">{c.descricao}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
