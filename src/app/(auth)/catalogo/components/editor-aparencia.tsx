"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, ImagePlus, Monitor, Smartphone, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { Vitrine, type CategoriaVitrine, type ProdutoVitrine } from "@/app/loja/components/vitrine"
import { avisoContraste, corValida, type LayoutVitrine, type TemaLoja } from "@/app/loja/components/tema"
import { FONTES } from "@/app/loja/components/fontes"

export type TipoImagemLoja = "logo" | "banner"

const LIMITE_IMAGEM: Record<TipoImagemLoja, number> = { logo: 2 * 1024 * 1024, banner: 5 * 1024 * 1024 }
const FORMATOS_IMAGEM = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]

/** Largura em que a prévia "Computador" é desenhada antes de ser reduzida para caber. */
const LARGURA_COMPUTADOR = 1280
const ALTURA_PREVIA = 760

const LAYOUTS: { id: LayoutVitrine; nome: string; descricao: string }[] = [
  { id: "grade", nome: "Grade", descricao: "Cartões em colunas" },
  { id: "lista", nome: "Lista", descricao: "Foto ao lado do texto" },
  { id: "destaque", nome: "Destaque", descricao: "Destaques no topo, depois as categorias" },
]

function MiniLayout({ layout }: { layout: LayoutVitrine }) {
  const bloco = "rounded-sm bg-current opacity-30"
  if (layout === "lista") {
    return (
      <div className="w-14 space-y-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-1"><div className={cn(bloco, "size-3")} /><div className={cn(bloco, "h-1.5 flex-1 mt-0.5")} /></div>
        ))}
      </div>
    )
  }
  if (layout === "destaque") {
    return (
      <div className="w-14 space-y-1">
        <div className="flex gap-1"><div className={cn(bloco, "h-5 w-6 opacity-60")} /><div className={cn(bloco, "h-5 w-6 opacity-60")} /></div>
        <div className="grid grid-cols-3 gap-1">{[0, 1, 2].map((i) => <div key={i} className={cn(bloco, "h-3")} />)}</div>
      </div>
    )
  }
  return <div className="w-14 grid grid-cols-3 gap-1">{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className={cn(bloco, "h-3")} />)}</div>
}

interface EditorAparenciaProps {
  inicial: TemaLoja
  categorias: CategoriaVitrine[]
  produtos: ProdutoVitrine[]
  avisoMinimo?: string | null
  /** Recebe o arquivo já conferido e devolve o endereço da imagem. */
  onEnviarImagem: (tipo: TipoImagemLoja, arquivo: File) => Promise<string>
  onSalvar: (tema: TemaLoja) => Promise<{ erro?: string; aviso?: string }>
}

export function EditorAparencia({ inicial, categorias, produtos, avisoMinimo, onEnviarImagem, onSalvar }: EditorAparenciaProps) {
  const [salvo, setSalvo] = useState<TemaLoja>(inicial)
  const [tema, setTema] = useState<TemaLoja>(inicial)
  const [dispositivo, setDispositivo] = useState<"celular" | "computador">("celular")
  const [erroImagem, setErroImagem] = useState<Partial<Record<TipoImagemLoja, string>>>({})
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "aviso"; texto: string } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const entradaLogo = useRef<HTMLInputElement>(null)
  const entradaBanner = useRef<HTMLInputElement>(null)
  const quadro = useRef<HTMLDivElement>(null)
  const [larguraQuadro, setLarguraQuadro] = useState(0)

  useEffect(() => {
    const el = quadro.current
    if (!el) return
    const observador = new ResizeObserver(([e]) => setLarguraQuadro(e.contentRect.width))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])
  const escala = larguraQuadro > 0 ? Math.min(1, larguraQuadro / LARGURA_COMPUTADOR) : 1

  const alterado = JSON.stringify(tema) !== JSON.stringify(salvo)
  const contraste = avisoContraste(tema)

  function mudar<K extends keyof TemaLoja>(campo: K, valor: TemaLoja[K]) {
    setTema((atual) => ({ ...atual, [campo]: valor }))
    setMensagem(null)
  }

  async function escolherImagem(tipo: TipoImagemLoja, arquivo: File | undefined) {
    if (!arquivo) return
    if (!FORMATOS_IMAGEM.includes(arquivo.type)) {
      setErroImagem((e) => ({ ...e, [tipo]: "Use PNG, JPG, SVG ou WebP." }))
      return
    }
    if (arquivo.size > LIMITE_IMAGEM[tipo]) {
      setErroImagem((e) => ({ ...e, [tipo]: `A imagem passa de ${LIMITE_IMAGEM[tipo] / 1024 / 1024} MB.` }))
      return
    }
    setErroImagem((e) => ({ ...e, [tipo]: undefined }))
    const url = await onEnviarImagem(tipo, arquivo)
    mudar(tipo === "logo" ? "logoUrl" : "bannerUrl", url)
  }

  async function salvar() {
    if (!tema.nomeLoja.trim()) {
      setMensagem({ tipo: "erro", texto: "Dê um nome à loja." })
      return
    }
    if (!corValida(tema.corPrincipal) || !corValida(tema.corFundo)) {
      setMensagem({ tipo: "erro", texto: "Use cores no formato #rrggbb." })
      return
    }
    setSalvando(true)
    const r = await onSalvar({ ...tema, nomeLoja: tema.nomeLoja.trim() })
    setSalvando(false)
    if (r.erro) setMensagem({ tipo: "erro", texto: r.erro })
    else {
      setSalvo(tema)
      if (r.aviso) setMensagem({ tipo: "aviso", texto: r.aviso })
    }
  }

  function seletorImagem(tipo: TipoImagemLoja) {
    const url = tipo === "logo" ? tema.logoUrl : tema.bannerUrl
    const entrada = tipo === "logo" ? entradaLogo : entradaBanner
    return (
      <div className="space-y-1.5">
        <Label>{tipo === "logo" ? "Logo" : "Banner de capa (opcional)"}</Label>
        <div className="flex items-center gap-2">
          <div className={cn("rounded-md border bg-muted/40 overflow-hidden flex items-center justify-center shrink-0", tipo === "logo" ? "size-12" : "h-12 w-28")}>
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={url} alt="" className={tipo === "logo" ? "size-full object-contain" : "size-full object-cover"} />
            ) : (
              <ImagePlus className="size-4 text-muted-foreground" />
            )}
          </div>
          <Button size="sm" variant="outline" onClick={() => entrada.current?.click()}>{url ? "Trocar" : "Escolher"}</Button>
          {url && (
            <Button size="icon-sm" variant="ghost" onClick={() => mudar(tipo === "logo" ? "logoUrl" : "bannerUrl", null)} aria-label={`Remover ${tipo}`}>
              <Trash2 />
            </Button>
          )}
          <input
            ref={entrada}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => { escolherImagem(tipo, e.target.files?.[0]); e.target.value = "" }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {tipo === "logo" ? "PNG, JPG, SVG ou WebP, até 2 MB. Sem logo, aparece o nome da loja." : "Até 5 MB. Formato largo (ex.: 1500 × 500)."}
        </p>
        {erroImagem[tipo] && <p className="text-xs text-destructive">{erroImagem[tipo]}</p>}
      </div>
    )
  }

  function seletorCor(campo: "corPrincipal" | "corFundo", rotulo: string) {
    const valor = tema[campo]
    return (
      <div className="space-y-1.5">
        <Label htmlFor={campo}>{rotulo}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={corValida(valor) ? valor : "#000000"}
            onChange={(e) => mudar(campo, e.target.value)}
            className="h-8 w-10 rounded border border-input bg-transparent cursor-pointer"
            aria-label={`${rotulo}: escolher`}
          />
          <Input id={campo} value={valor} onChange={(e) => mudar(campo, e.target.value)} className="h-8 w-28 font-mono" aria-invalid={!corValida(valor)} />
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-5">
        {mensagem && (
          <p role="status" className={cn("rounded-lg border px-3 py-2 text-sm", mensagem.tipo === "erro" ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-300")}>
            {mensagem.texto}
          </p>
        )}

        <section className="rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold">Marca</h2>
          {seletorImagem("logo")}
          {seletorImagem("banner")}
          <div className="space-y-1.5">
            <Label htmlFor="nomeLoja">Nome da loja</Label>
            <Input id="nomeLoja" value={tema.nomeLoja} onChange={(e) => mudar("nomeLoja", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="boasVindas">Texto de boas-vindas (opcional)</Label>
            <Input id="boasVindas" value={tema.boasVindas} onChange={(e) => mudar("boasVindas", e.target.value)} maxLength={140} placeholder="Ex.: Moda feminina no atacado desde 2015" />
          </div>
        </section>

        <section className="rounded-lg border p-4 space-y-4">
          <h2 className="text-sm font-semibold">Cores</h2>
          <div className="flex flex-wrap gap-4">
            {seletorCor("corPrincipal", "Cor principal")}
            {seletorCor("corFundo", "Cor de fundo")}
          </div>
          <p className="text-xs text-muted-foreground">A cor dos textos acompanha o fundo sozinha, para sempre dar para ler.</p>
          {contraste && (
            <p className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <AlertTriangle className="size-4 shrink-0" />
              {contraste}
            </p>
          )}
        </section>

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">Fonte</h2>
          <div className="grid grid-cols-2 gap-2">
            {FONTES.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => mudar("fonteId", f.id)}
                className={cn("rounded-lg border px-3 py-2 text-left transition-colors", tema.fonteId === f.id ? "border-primary bg-primary/10" : "hover:bg-muted/40")}
                aria-pressed={tema.fonteId === f.id}
              >
                <span className="block text-base truncate" style={{ fontFamily: f.familia }}>{tema.nomeLoja || f.nome}</span>
                <span className="block text-[11px] text-muted-foreground">{f.nome} · {f.estilo}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="text-sm font-semibold">Modelo de layout</h2>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => mudar("layout", l.id)}
                className={cn("rounded-lg border p-2.5 flex flex-col items-center gap-2 text-center", tema.layout === l.id ? "border-primary bg-primary/10" : "hover:bg-muted/40")}
                aria-pressed={tema.layout === l.id}
                title={l.descricao}
              >
                <MiniLayout layout={l.id} />
                <span className="text-xs font-medium">{l.nome}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{LAYOUTS.find((l) => l.id === tema.layout)?.descricao}</p>
        </section>

        <div className="sticky bottom-0 flex items-center justify-end gap-2 bg-background/95 py-3 border-t">
          {alterado && <span className="mr-auto text-xs text-amber-300">Alterações não salvas</span>}
          <Button variant="outline" size="sm" onClick={() => { setTema(salvo); setMensagem(null) }} disabled={!alterado}>Descartar alterações</Button>
          <Button size="sm" onClick={salvar} disabled={!alterado || salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </div>
      </div>

      <div className="space-y-3 min-w-0">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Prévia</h2>
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Largura da prévia">
            {([["celular", Smartphone, "Celular"], ["computador", Monitor, "Computador"]] as const).map(([id, Icone, rotulo]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDispositivo(id)}
                className={cn("flex items-center gap-1.5 rounded-md px-2.5 h-7 text-xs", dispositivo === id ? "bg-muted text-foreground" : "text-muted-foreground")}
                aria-pressed={dispositivo === id}
              >
                <Icone className="size-3.5" />
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        <div ref={quadro} className="flex justify-center rounded-xl border bg-muted/20 p-4">
          {dispositivo === "celular" ? (
            <div className="w-[390px] overflow-y-auto overflow-x-hidden border shadow-xl rounded-[2rem]" style={{ height: ALTURA_PREVIA }} data-testid="previa-vitrine">
              <Vitrine tema={tema} categorias={categorias} produtos={produtos} quantidadeNoCarrinho={3} avisoMinimo={avisoMinimo} />
            </div>
          ) : (
            // Desenhada a 1280 px e reduzida: mostra o que a cliente vê num computador.
            <div className="overflow-hidden border shadow-xl rounded-lg" style={{ width: LARGURA_COMPUTADOR * escala, height: ALTURA_PREVIA }}>
              <div
                className="overflow-y-auto overflow-x-hidden origin-top-left"
                style={{ width: LARGURA_COMPUTADOR, height: ALTURA_PREVIA / escala, transform: `scale(${escala})` }}
                data-testid="previa-vitrine"
              >
                <Vitrine tema={tema} categorias={categorias} produtos={produtos} quantidadeNoCarrinho={3} avisoMinimo={avisoMinimo} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
