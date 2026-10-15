"use client"

// Editor de fluxo de uma automação: canvas com os blocos ligados, painel do
// bloco selecionado, simulação com um contato e salvar. Quem grava, quem busca
// contatos e quem simula vêm por parâmetro: as actions do servidor (B11-10).
// O que não foi salvo vira rascunho no navegador e pede confirmação para sair (B22-08).
// A proteção de repetição é escolhida no painel do gatilho (B22-09).
// O resultado do "Testar com um contato" deixa de valer quando o fluxo muda (B22-10),
// e o teste só roda com o fluxo completo, como o Salvar (B22-11).

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
  formaLaco,
  gatilhoDoFluxo,
  horasValidas,
  pendenciasDoFluxo,
  repeticaoPadrao,
  respondeTodaMensagem,
  copiaDoBloco,
  type Bloco,
  type Fluxo,
  type Repeticao,
  type ResultadoSimulacao,
  type Saida,
} from "@/lib/fluxo-automacao"
import { referenciasQueSumiram, type OpcoesEditor } from "./catalogo"
import {
  ContextoEditorFluxo,
  TIPOS_DE_BLOCO,
  TIPOS_DE_LIGACAO,
  type LigacaoFluxo,
  type NoFluxo,
} from "./blocos-fluxo"
import { MenuNovoBloco, type ItemNovoBloco } from "./menu-novo-bloco"
import { PainelBloco, type GuardarArquivo } from "./painel-bloco"
import {
  apagarRascunho,
  assinatura,
  assinaturaDoCaminho,
  guardarRascunho,
  useRascunhoDaAbertura,
} from "./rascunho-editor"

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
  /** Sobe o arquivo da ação "enviar imagem ou documento" (B11-07). */
  guardarArquivo: GuardarArquivo
  onVoltar: () => void
  /** Onde fica o rascunho desta regra no navegador (`chaveDoRascunho`). */
  chaveRascunho: string
  /** Regra ainda não salva: a repetição acompanha o gatilho até ser escolhida (B22-09). */
  regraNova: boolean
  /** Aviso que o editor já mostra ao abrir, como "Automação salva" logo depois do primeiro salvamento. */
  avisoInicial?: string
}

// Distância do bloco novo até o bloco de onde ele sai
const ESPACO_VERTICAL = 90
const DESVIO_LATERAL = 170

// A cópia nasce à direita do original, sem cobrir o "+" da saída dele (e desce até achar espaço livre)
const DISTANCIA_DA_COPIA = 40

// Espera depois da última edição antes de guardar o rascunho
const ESPERA_RASCUNHO_MS = 1000

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

function paraLigacoes(fluxo: Fluxo): LigacaoFluxo[] {
  return fluxo.ligacoes.map((l) => novaLigacao(l.de, l.saida, l.para))
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
  guardarArquivo,
  onVoltar,
  chaveRascunho,
  regraNova,
  avisoInicial,
}: EditorFluxoProps) {
  const [nos, setNos, onNodesChange] = useNodesState<NoFluxo>(paraNos(regraInicial.fluxo))
  const [ligacoes, setLigacoes, onEdgesChange] = useEdgesState<LigacaoFluxo>(paraLigacoes(regraInicial.fluxo))
  const [nome, setNome] = useState(regraInicial.nome)
  const [repeticao, setRepeticao] = useState<Repeticao>(regraInicial.repeticao)
  // A pessoa escolheu a repetição: trocar o gatilho deixa de trocá-la
  const [repeticaoEscolhida, setRepeticaoEscolhida] = useState(false)

  const [menu, setMenu] = useState<{ de: string; saida: Saida } | "solto" | null>(null)
  const [dialogTeste, setDialogTeste] = useState(false)
  // `caminho`: assinatura do fluxo testado, para saber se o resultado ainda vale
  const [simulacao, setSimulacao] = useState<{
    contato: ContatoTeste
    resultado: ResultadoSimulacao
    caminho: string
  } | null>(null)
  const [avisoRepeticao, setAvisoRepeticao] = useState(false)
  const [destacarErros, setDestacarErros] = useState(false)
  const [erroNome, setErroNome] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "ok"; texto: string } | null>(
    avisoInicial ? { tipo: "ok", texto: avisoInicial } : null
  )
  const [salvando, setSalvando] = useState(false)
  const salvandoAgora = useRef(false)
  const [confirmarSaida, setConfirmarSaida] = useState(false)
  // B22-36: apagar 2 ou mais blocos de uma vez espera a resposta da pessoa
  const [confirmarApagar, setConfirmarApagar] = useState<{ quantos: number; responder: (sim: boolean) => void } | null>(
    null
  )
  // Assinatura do que está gravado no banco: a da abertura e, depois, a de cada salvamento
  const [salvo, setSalvo] = useState(() => assinatura(regraInicial))
  const rascunhoDaAbertura = useRascunhoDaAbertura(chaveRascunho)
  const [rascunhoResolvido, setRascunhoResolvido] = useState(false)

  const areaRef = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, deleteElements, fitView } = useReactFlow<NoFluxo, LigacaoFluxo>()

  const fluxo = useMemo(() => paraFluxo(nos, ligacoes), [nos, ligacoes])
  const alterado = useMemo(() => assinatura({ nome, repeticao, fluxo }), [nome, repeticao, fluxo]) !== salvo
  // Rascunho de outra visita esperando "Recuperar" ou "Descartar". Igual ao salvo não conta.
  const assinaturaDoRascunho = useMemo(
    () => (rascunhoDaAbertura ? assinatura(rascunhoDaAbertura.regra) : null),
    [rascunhoDaAbertura]
  )
  const rascunhoAchado =
    !rascunhoResolvido && rascunhoDaAbertura && assinaturaDoRascunho !== salvo ? rascunhoDaAbertura : null
  // B22-27: escolha apagada (etiqueta, time, mensagem rápida…) marca o bloco, como as outras pendências
  const pendencias = useMemo(() => {
    const doFluxo = pendenciasDoFluxo(fluxo)
    const porBloco = { ...doFluxo.porBloco }
    for (const [id, motivos] of Object.entries(referenciasQueSumiram(fluxo, opcoes))) {
      porBloco[id] = [...(porBloco[id] ?? []), ...motivos]
    }
    return { ...doFluxo, porBloco }
  }, [fluxo, opcoes])
  const caminhoAtual = useMemo(() => assinaturaDoCaminho(fluxo), [fluxo])
  const simulacaoVelha = simulacao !== null && simulacao.caminho !== caminhoAtual
  const selecionado = nos.find((n) => n.selected)

  const contexto = useMemo(
    () => ({
      opcoes,
      pendencias: pendencias.porBloco,
      destacarErros,
      simulacao: simulacao && !simulacaoVelha ? simulacao.resultado : null,
      repeticao,
      aoAdicionar: (de: string, saida: Saida) => setMenu({ de, saida }),
    }),
    [opcoes, pendencias, destacarErros, simulacao, simulacaoVelha, repeticao]
  )

  // Guarda o que não foi salvo um instante depois da última edição; sem alteração,
  // não há rascunho. Enquanto o rascunho de outra visita espera decisão, ele não é tocado.
  useEffect(() => {
    if (rascunhoDaAbertura === undefined || rascunhoAchado) return
    if (!alterado) {
      apagarRascunho(chaveRascunho)
      return
    }
    const espera = setTimeout(
      () =>
        guardarRascunho(chaveRascunho, {
          regra: { nome, repeticao, fluxo },
          base: salvo,
          guardadoEm: new Date().toISOString(),
        }),
      ESPERA_RASCUNHO_MS
    )
    return () => clearTimeout(espera)
  }, [rascunhoDaAbertura, rascunhoAchado, alterado, chaveRascunho, nome, repeticao, fluxo, salvo])

  // Fechar a aba, recarregar ou digitar outro endereço com algo não salvo: o navegador pergunta
  useEffect(() => {
    if (!alterado) return
    const segurar = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", segurar)
    return () => window.removeEventListener("beforeunload", segurar)
  }, [alterado])

  function recuperarRascunho() {
    if (!rascunhoAchado) return
    const { regra } = rascunhoAchado
    setNos(paraNos(regra.fluxo))
    setLigacoes(paraLigacoes(regra.fluxo))
    setNome(regra.nome)
    setRepeticao(regra.repeticao)
    // Repetição do rascunho fora do padrão do gatilho dele foi escolhida pela pessoa
    const gatilhoDoRascunho = gatilhoDoFluxo(regra.fluxo)?.gatilho
    setRepeticaoEscolhida(!gatilhoDoRascunho || regra.repeticao.modo !== repeticaoPadrao(gatilhoDoRascunho).modo)
    setSimulacao(null)
    setRascunhoResolvido(true)
    // Espera os blocos recuperados aparecerem para enquadrar o desenho
    requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1 }))
  }

  function descartarRascunho() {
    apagarRascunho(chaveRascunho)
    setRascunhoResolvido(true)
  }

  function voltar() {
    if (alterado) setConfirmarSaida(true)
    else onVoltar()
  }

  function sairSemSalvar() {
    apagarRascunho(chaveRascunho)
    setConfirmarSaida(false)
    onVoltar()
  }

  // Apagar um bloco continua direto; 2 ou mais pedem confirmação (decidido pelo Luan em 14/10).
  // A tecla é tratada aqui, e não pelo atalho do React Flow: com o diálogo aberto ao
  // descer a tecla, ele não via a tecla subir e deixava de apagar depois de um "Cancelar".
  // Como o atalho dele, vale com o foco em qualquer lugar da página, menos em campo de
  // texto e com diálogo aberto.
  useEffect(() => {
    function aoApertar(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest("input, textarea, select, [contenteditable='true']")) return
      if (document.querySelector("[role='dialog']")) return
      const blocos = nos.filter((n) => n.selected && n.deletable !== false)
      const setas = ligacoes.filter((l) => l.selected)
      if (blocos.length === 0 && setas.length === 0) return
      e.preventDefault()
      const apagar = () =>
        deleteElements({ nodes: blocos.map((n) => ({ id: n.id })), edges: setas.map((l) => ({ id: l.id })) })
      if (blocos.length >= 2) setConfirmarApagar({ quantos: blocos.length, responder: (sim) => sim && apagar() })
      else apagar()
    }
    document.addEventListener("keydown", aoApertar)
    return () => document.removeEventListener("keydown", aoApertar)
  }, [nos, ligacoes, deleteElements])

  function responderApagar(sim: boolean) {
    confirmarApagar?.responder(sim)
    setConfirmarApagar(null)
  }

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

  /** "Duplicar" do painel: a cópia fica solta e selecionada, para ligar onde quiser (B22-13). */
  function duplicarBloco(original: NoFluxo) {
    const bloco = original.data.bloco
    if (bloco.tipo === "gatilho") return
    const id = crypto.randomUUID()
    const largura = original.measured?.width ?? LARGURA_BLOCO
    const posicao = posicaoLivre(
      { x: original.position.x + largura + DISTANCIA_DA_COPIA, y: original.position.y },
      nos
    )
    const copia = copiaDoBloco(bloco, id, posicao, () => crypto.randomUUID())
    setNos((atuais) => [
      ...atuais.map((n) => ({ ...n, selected: false })),
      { id, type: copia.tipo, position: posicao, data: { bloco: copia }, selected: true },
    ])
  }

  function mudarBloco(bloco: Bloco) {
    setNos((atuais) => atuais.map((n) => (n.id === bloco.id ? { ...n, data: { bloco } } : n)))
    if (bloco.tipo === "gatilho" && regraNova && !repeticaoEscolhida) setRepeticao(repeticaoPadrao(bloco.gatilho))
  }

  function mudarRepeticao(nova: Repeticao) {
    setRepeticao(nova)
    setRepeticaoEscolhida(true)
  }

  function fecharPainel() {
    setNos((atuais) => atuais.map((n) => ({ ...n, selected: false })))
  }

  async function testar(contato: ContatoTeste) {
    setDialogTeste(false)
    setMensagem(null)
    const testado = fluxo
    const { erro, resultado } = await simular(contato.id, testado)
    if (erro || !resultado) {
      setSimulacao(null)
      setMensagem({ tipo: "erro", texto: erro ?? "Não foi possível testar agora." })
      return
    }
    setSimulacao({ contato, resultado, caminho: assinaturaDoCaminho(testado) })
  }

  /** O que falta no fluxo, em frases, para o Salvar e o Testar. */
  function frasesDasPendencias(): string[] {
    const blocosComProblema = Object.keys(pendencias.porBloco).length
    const partes: string[] = []
    if (blocosComProblema > 0) {
      partes.push(blocosComProblema === 1 ? "Corrija o bloco marcado" : `Corrija os ${blocosComProblema} blocos marcados`)
    }
    return [...partes, ...pendencias.gerais]
  }

  /** Fluxo incompleto não é testado: marca os blocos e diz o que falta. */
  function podeTestar(): boolean {
    const partes = frasesDasPendencias()
    if (partes.length === 0) return true
    setDestacarErros(true)
    setMensagem({ tipo: "erro", texto: `${partes.join(". ")} antes de testar` })
    return false
  }

  async function tentarSalvar(aceitouAviso = false) {
    setMensagem(null)
    const nomeOk = nome.trim() !== ""
    setErroNome(!nomeOk)
    const horasOk = repeticao.modo !== "a_cada_horas" || horasValidas(repeticao.horas)
    const partes = [
      ...(nomeOk ? [] : ["Dê um nome à automação"]),
      ...(horasOk ? [] : ["Corrija as horas da repetição, no gatilho"]),
      ...frasesDasPendencias(),
    ]

    if (partes.length > 0) {
      setDestacarErros(true)
      setMensagem({ tipo: "erro", texto: partes.join(". ") })
      return
    }

    if (!aceitouAviso && respondeTodaMensagem(fluxo, repeticao)) {
      setAvisoRepeticao(true)
      return
    }
    setAvisoRepeticao(false)

    // B22-31: cliques seguidos chegam antes de o botão ficar desabilitado na tela;
    // a referência muda na hora, e só um salvamento roda por vez
    if (salvandoAgora.current) return
    salvandoAgora.current = true
    setSalvando(true)
    const enviada = { nome: nome.trim(), repeticao, fluxo }
    const resultado = await salvar(enviada).finally(() => {
      salvandoAgora.current = false
    })
    setSalvando(false)
    if (resultado.erro) {
      setMensagem({ tipo: "erro", texto: resultado.erro })
      return
    }
    // O que for editado enquanto salva continua contando como alteração
    setSalvo(assinatura(enviada))
    apagarRascunho(chaveRascunho)
    setMensagem({ tipo: "ok", texto: resultado.aviso ?? "Automação salva" })
  }

  // "Automação salva" deixa de valer na edição seguinte
  const aviso = mensagem?.tipo === "ok" && alterado ? null : mensagem

  const acoesNoCaminho = simulacao
    ? simulacao.resultado.blocos.filter((id) => fluxo.blocos.find((b) => b.id === id)?.tipo === "acao").length
    : 0

  return (
    <div className="flex min-h-[560px] flex-1 flex-col">
      {/* Barra do topo */}
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="sm" onClick={voltar}>
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
        <div className="flex items-center gap-2 sm:ml-auto">
          {alterado && <span className="text-xs text-muted-foreground">Alterações não salvas</span>}
          <Button variant="outline" size="sm" onClick={() => setMenu("solto")}>
            <Plus />
            <span className="hidden md:inline">Adicionar bloco</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => podeTestar() && setDialogTeste(true)}>
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
            deleteKeyCode={null}
            colorMode="dark"
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.3}
          >
            <Background gap={20} />
            <Controls showInteractive={false} />
            {(aviso || simulacao || rascunhoAchado) && (
              <Panel position="top-center" className="flex max-w-[90vw] flex-col items-center gap-2">
                {rascunhoAchado && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-500/40 bg-background px-3 py-2 text-sm text-amber-200 shadow-sm"
                  >
                    <span>
                      Há alterações não salvas de {quandoFoiGuardado(rascunhoAchado.guardadoEm)}.
                      {rascunhoAchado.base !== salvo &&
                        " A automação foi salva depois disso: recuperar troca o que está salvo pelo rascunho."}
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="xs" onClick={recuperarRascunho}>
                        Recuperar
                      </Button>
                      <Button variant="ghost" size="xs" onClick={descartarRascunho}>
                        Descartar
                      </Button>
                    </div>
                  </div>
                )}
                {aviso && (
                  <div
                    role={aviso.tipo === "erro" ? "alert" : "status"}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-sm",
                      aviso.tipo === "erro"
                        ? "border-destructive/50 bg-background text-destructive"
                        : "border-emerald-500/40 bg-background text-emerald-300"
                    )}
                  >
                    <span>{aviso.texto}</span>
                    <Button variant="ghost" size="icon-xs" aria-label="Fechar aviso" onClick={() => setMensagem(null)}>
                      <X />
                    </Button>
                  </div>
                )}
                {simulacao && simulacaoVelha && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-500/40 bg-background px-3 py-2 text-sm text-amber-200 shadow-sm">
                    <span>
                      <strong>Simulação para {simulacao.contato.nome}:</strong> o fluxo mudou depois do teste.
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="xs" onClick={() => podeTestar() && testar(simulacao.contato)}>
                        Testar de novo
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setSimulacao(null)}>
                        Limpar
                      </Button>
                    </div>
                  </div>
                )}
                {simulacao && !simulacaoVelha && (
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
            repeticao={repeticao}
            onMudarRepeticao={mudarRepeticao}
            opcoes={opcoes}
            pendencias={pendencias.porBloco[selecionado.id] ?? []}
            guardarArquivo={guardarArquivo}
            onMudar={mudarBloco}
            onRemover={() => deleteElements({ nodes: [{ id: selecionado.id }] })}
            onDuplicar={() => duplicarBloco(selecionado)}
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

      {/* Sair com alterações não salvas */}
      <Dialog open={confirmarSaida} onOpenChange={setConfirmarSaida}>
        <DialogPopup className="max-w-md">
          <DialogTitle className="mb-2">Sair sem salvar?</DialogTitle>
          <DialogDescription className="mb-4">
            As alterações desta automação ainda não foram salvas e serão perdidas.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" />}>Continuar editando</DialogClose>
            <Button variant="destructive" onClick={sairSemSalvar}>
              Sair sem salvar
            </Button>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Apagar vários blocos */}
      <Dialog open={confirmarApagar !== null} onOpenChange={(aberto) => !aberto && responderApagar(false)}>
        <DialogPopup className="max-w-md">
          <DialogTitle className="mb-2">Apagar {confirmarApagar?.quantos} blocos?</DialogTitle>
          <DialogDescription className="mb-4">
            Os blocos selecionados e as ligações deles saem do fluxo. Não dá para desfazer.
          </DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => responderApagar(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => responderApagar(true)}>
              Apagar
            </Button>
          </div>
        </DialogPopup>
      </Dialog>

      {/* Aviso: regra que responde toda mensagem */}
      <Dialog open={avisoRepeticao} onOpenChange={setAvisoRepeticao}>
        <DialogPopup className="max-w-md">
          <DialogTitle className="mb-2">Esta regra vai responder toda mensagem deste contato</DialogTitle>
          <DialogDescription className="mb-4">
            O gatilho é &quot;mensagem recebida&quot;, o caminho envia mensagem e a repetição está em
            &quot;sempre&quot;. Cada mensagem do cliente gera uma resposta nova. Para evitar, escolha no gatilho
            &quot;uma vez por contato&quot; ou &quot;no máximo a cada N horas&quot;.
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

/** "13/10 às 14:32", no horário de quem está vendo. */
function quandoFoiGuardado(iso: string): string {
  const data = new Date(iso)
  const dia = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${dia} às ${hora}`
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
