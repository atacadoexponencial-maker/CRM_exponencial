"use client"

import { useRef, useState } from "react"
import { Loader2, Paperclip, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogClose } from "@/components/ui/dialog"
import {
  AVISO_SEM_EXEMPLO_DO_CABECALHO,
  MAXIMO_DE_BOTOES,
  quantidadeDeVariaveis,
  type BotaoDoTemplate,
  type ExemplosDoTemplate,
  type PartesDoTemplate,
  type TipoDeCabecalho,
} from "@/lib/templates-da-meta"
import { conferirNomeDoTemplate, nomeFinalDoTemplate } from "./nome-do-template"
import { enviarExemploDoCabecalho } from "./actions"

// B54-02: o formulário de template, para criar e para editar. Tem tudo o que a Meta
// deixa mandar: cabeçalho (nenhum, texto ou mídia com arquivo de exemplo), corpo,
// rodapé e até três botões. Ao editar, nome e idioma ficam travados (a Meta não deixa
// mudar) e, se o template está aprovado, aparece o aviso do limite de edições.

export const CATEGORIAS = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utilidade" },
  { value: "AUTHENTICATION", label: "Autenticação" },
]

export const IDIOMAS = [
  { value: "pt_BR", label: "Português (Brasil)" },
  { value: "en_US", label: "Inglês (EUA)" },
  { value: "es", label: "Espanhol" },
]

export const AVISO_NOME_E_IDIOMA = "A Meta não deixa mudar o nome nem o idioma de um template criado"
export const AVISO_LIMITE_DE_EDICOES_DO_APROVADO = "Template aprovado pode ser editado até 10 vezes em 30 dias, uma por dia"

const CABECALHOS: Array<{ value: TipoDeCabecalho | "nenhum"; label: string }> = [
  { value: "nenhum", label: "Nenhum" },
  { value: "texto", label: "Texto" },
  { value: "imagem", label: "Imagem" },
  { value: "video", label: "Vídeo" },
  { value: "documento", label: "Documento" },
]

const TIPOS_DE_BOTAO: Array<{ value: BotaoDoTemplate["tipo"]; label: string }> = [
  { value: "resposta_rapida", label: "Resposta rápida" },
  { value: "link", label: "Abrir link" },
  { value: "telefone", label: "Ligar" },
]

export type ValoresDoFormulario = {
  name: string
  category: string
  language: string
  partes: PartesDoTemplate
  headerHandle: string | null
  /** Um exemplo por variável, pedido na tela (SUP-B54-09). */
  exemplos: ExemplosDoTemplate
}

type Props = {
  /** Sem `inicial`, é criação. Com ele, é edição do template que está na Meta. */
  inicial?: { name: string; category: string; language: string; status: string; partes: PartesDoTemplate | null }
  salvando: boolean
  erro: string | null
  onErro: (erro: string | null) => void
  onSalvar: (valores: ValoresDoFormulario) => void
}

const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm"
const textareaClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

function cabecalhoEhMidia(tipo: TipoDeCabecalho | "nenhum"): boolean {
  return tipo === "imagem" || tipo === "video" || tipo === "documento"
}

export function FormularioDoTemplate({ inicial, salvando, erro, onErro, onSalvar }: Props) {
  const editando = inicial !== undefined
  const partesIniciais = inicial?.partes

  const [name, setName] = useState(inicial?.name ?? "")
  const [category, setCategory] = useState(inicial?.category ?? "MARKETING")
  const [language, setLanguage] = useState(inicial?.language ?? "pt_BR")
  const [tipoCabecalho, setTipoCabecalho] = useState<TipoDeCabecalho | "nenhum">(partesIniciais?.cabecalho?.tipo ?? "nenhum")
  const [textoCabecalho, setTextoCabecalho] = useState(partesIniciais?.cabecalho?.texto ?? "")
  const [body, setBody] = useState(partesIniciais?.corpo ?? "")
  const [rodape, setRodape] = useState(partesIniciais?.rodape ?? "")
  const [botoes, setBotoes] = useState<BotaoDoTemplate[]>(partesIniciais?.botoes ?? [])
  const [exemplosCorpo, setExemplosCorpo] = useState<string[]>([])
  const [exemplosCabecalho, setExemplosCabecalho] = useState<string[]>([])
  const [exemplosLinks, setExemplosLinks] = useState<Record<number, string>>({})
  const [headerHandle, setHeaderHandle] = useState<string | null>(null)
  const [nomeDoExemplo, setNomeDoExemplo] = useState<string | null>(null)
  const [enviandoExemplo, setEnviandoExemplo] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  function trocarCabecalho(tipo: TipoDeCabecalho | "nenhum") {
    setTipoCabecalho(tipo)
    setHeaderHandle(null)
    setNomeDoExemplo(null)
  }

  async function handleExemplo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setEnviandoExemplo(true)
    onErro(null)
    const formData = new FormData()
    formData.append("arquivo", arquivo)
    const resultado = await enviarExemploDoCabecalho(formData)
    setEnviandoExemplo(false)
    if (resultado.erro || !resultado.handle) {
      onErro(resultado.erro ?? "Não foi possível enviar o arquivo de exemplo à Meta")
      return
    }
    setHeaderHandle(resultado.handle)
    setNomeDoExemplo(arquivo.name)
  }

  function mudarBotao(i: number, mudanca: Partial<BotaoDoTemplate>) {
    setBotoes((prev) => prev.map((b, j) => (j === i ? { ...b, ...mudanca } : b)))
  }

  function handleSalvar() {
    if (!editando) {
      const conferido = conferirNomeDoTemplate(name)
      if ("erro" in conferido) { onErro(conferido.erro); return }
    }
    if (!body.trim()) { onErro("Corpo da mensagem é obrigatório"); return }
    if (cabecalhoEhMidia(tipoCabecalho) && !headerHandle) { onErro(AVISO_SEM_EXEMPLO_DO_CABECALHO); return }
    for (let n = 1; n <= variaveisDoCorpo; n++) {
      if (!exemplosCorpo[n - 1]?.trim()) { onErro(`Preencha o exemplo da variável {{${n}}} do corpo`); return }
    }
    for (let n = 1; n <= variaveisDoCabecalho; n++) {
      if (!exemplosCabecalho[n - 1]?.trim()) { onErro(`Preencha o exemplo da variável {{${n}}} do cabeçalho`); return }
    }
    for (const [i, b] of botoes.entries()) {
      if (!b.texto.trim()) { onErro("Todo botão precisa de um texto"); return }
      if (b.tipo === "link" && !b.url?.trim()) { onErro("O botão de link precisa do endereço"); return }
      if (b.tipo === "link" && quantidadeDeVariaveis(b.url ?? "") > 0 && !exemplosLinks[i]?.trim()) {
        onErro(`Preencha o exemplo do link do botão ${i + 1}`); return
      }
      if (b.tipo === "telefone" && !b.telefone?.trim()) { onErro("O botão de ligar precisa do telefone"); return }
    }

    onErro(null)
    onSalvar({
      name: editando ? name : nomeFinalDoTemplate(name),
      category,
      language,
      partes: {
        cabecalho:
          tipoCabecalho === "nenhum"
            ? null
            : tipoCabecalho === "texto"
              ? { tipo: "texto", texto: textoCabecalho.trim() }
              : { tipo: tipoCabecalho },
        corpo: body.trim(),
        rodape: rodape.trim() || null,
        botoes: botoes.map((b) => ({ ...b, texto: b.texto.trim() })),
      },
      headerHandle,
      exemplos: {
        corpo: exemplosCorpo.slice(0, variaveisDoCorpo),
        cabecalho: tipoCabecalho === "texto" ? exemplosCabecalho.slice(0, variaveisDoCabecalho) : [],
        links: exemplosLinks,
      },
    })
  }

  const variaveisDoCorpo = quantidadeDeVariaveis(body)
  const variaveisDoCabecalho = tipoCabecalho === "texto" ? quantidadeDeVariaveis(textoCabecalho) : 0

  function camposDeExemplo(quantas: number, valores: string[], mudar: (v: string[]) => void, onde: string) {
    if (quantas === 0) return null
    return (
      <div className="flex flex-col gap-1.5 rounded-md border border-dashed p-2">
        <p className="text-xs text-muted-foreground">
          A Meta pede um exemplo de cada variável do {onde} para analisar o template.
        </p>
        {Array.from({ length: quantas }, (_, i) => (
          <Input
            key={i}
            aria-label={`Exemplo da variável {{${i + 1}}} do ${onde}`}
            placeholder={`Exemplo para {{${i + 1}}}`}
            value={valores[i] ?? ""}
            onChange={(e) => {
              const novo = [...valores]
              novo[i] = e.target.value
              mudar(novo)
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {editando && (
        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{AVISO_NOME_E_IDIOMA}</p>
      )}
      {editando && inicial.status === "APPROVED" && (
        <p className="rounded-md bg-aviso-fundo px-3 py-2 text-xs text-aviso">{AVISO_LIMITE_DE_EDICOES_DO_APROVADO}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          placeholder="meu_template_1"
          value={name}
          disabled={editando}
          onChange={(e) => setName(e.target.value)}
        />
        {!editando && (
          <>
            <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e underscores.</p>
            {nomeFinalDoTemplate(name) && (
              <p className="text-xs text-muted-foreground">
                Será enviado como <span className="font-mono text-foreground">{nomeFinalDoTemplate(name)}</span>
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="categoria">Categoria</Label>
          <select id="categoria" value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
            {CATEGORIAS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="idioma">Idioma</Label>
          <select id="idioma" value={language} disabled={editando} onChange={(e) => setLanguage(e.target.value)} className={selectClass}>
            {IDIOMAS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="cabecalho">Cabeçalho</Label>
        <select
          id="cabecalho"
          value={tipoCabecalho}
          onChange={(e) => trocarCabecalho(e.target.value as TipoDeCabecalho | "nenhum")}
          className={selectClass}
        >
          {CABECALHOS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        {tipoCabecalho === "texto" && (
          <Input
            id="cabecalho-texto"
            aria-label="Texto do cabeçalho"
            placeholder="Oferta da semana"
            value={textoCabecalho}
            onChange={(e) => setTextoCabecalho(e.target.value)}
          />
        )}
        {tipoCabecalho === "texto" && camposDeExemplo(variaveisDoCabecalho, exemplosCabecalho, setExemplosCabecalho, "cabeçalho")}
        {cabecalhoEhMidia(tipoCabecalho) && (
          <>
            <input
              ref={arquivoRef}
              type="file"
              data-testid="arquivo-de-exemplo"
              accept={tipoCabecalho === "imagem" ? "image/*" : tipoCabecalho === "video" ? "video/*" : undefined}
              className="hidden"
              onChange={handleExemplo}
            />
            <button
              type="button"
              onClick={() => arquivoRef.current?.click()}
              disabled={enviandoExemplo}
              className="flex items-center gap-2 rounded-md border border-dashed bg-card/60 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {enviandoExemplo ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              {nomeDoExemplo ?? "Escolher arquivo de exemplo…"}
            </button>
            <p className="text-xs text-muted-foreground">
              A Meta usa este arquivo só para analisar o template. O arquivo de cada envio é escolhido na campanha.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="corpo">Corpo da mensagem</Label>
        <textarea
          id="corpo"
          rows={4}
          placeholder="Olá {{1}}, tudo bem? Seu pedido {{2}} está pronto!"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={textareaClass}
        />
        <p className="text-xs text-muted-foreground">Use {"{{1}}"}, {"{{2}}"} para variáveis dinâmicas.</p>
        {camposDeExemplo(variaveisDoCorpo, exemplosCorpo, setExemplosCorpo, "corpo")}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="rodape">Rodapé (opcional)</Label>
        <Input id="rodape" placeholder="Responda SAIR para não receber mais" value={rodape} onChange={(e) => setRodape(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Botões (até {MAXIMO_DE_BOTOES})</Label>
          {botoes.length < MAXIMO_DE_BOTOES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBotoes((prev) => [...prev, { tipo: "resposta_rapida", texto: "" }])}
            >
              <Plus className="size-3.5" /> Adicionar botão
            </Button>
          )}
        </div>
        {botoes.map((b, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-md border p-2" data-testid={`botao-${i}`}>
            <div className="flex gap-2">
              <select
                aria-label={`Tipo do botão ${i + 1}`}
                value={b.tipo}
                onChange={(e) => mudarBotao(i, { tipo: e.target.value as BotaoDoTemplate["tipo"], url: undefined, telefone: undefined })}
                className={selectClass}
              >
                {TIPOS_DE_BOTAO.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <Input
                aria-label={`Texto do botão ${i + 1}`}
                placeholder="Texto do botão"
                value={b.texto}
                onChange={(e) => mudarBotao(i, { texto: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover botão ${i + 1}`}
                onClick={() => setBotoes((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {b.tipo === "link" && (
              <Input
                aria-label={`Endereço do botão ${i + 1}`}
                placeholder="https://sualoja.com.br/catalogo"
                value={b.url ?? ""}
                onChange={(e) => mudarBotao(i, { url: e.target.value })}
              />
            )}
            {b.tipo === "link" && quantidadeDeVariaveis(b.url ?? "") > 0 && (
              <Input
                aria-label={`Exemplo do link do botão ${i + 1}`}
                placeholder="https://sualoja.com.br/catalogo/exemplo"
                value={exemplosLinks[i] ?? ""}
                onChange={(e) => setExemplosLinks((prev) => ({ ...prev, [i]: e.target.value }))}
              />
            )}
            {b.tipo === "telefone" && (
              <Input
                aria-label={`Telefone do botão ${i + 1}`}
                placeholder="+5511999999999"
                value={b.telefone ?? ""}
                onChange={(e) => mudarBotao(i, { telefone: e.target.value })}
              />
            )}
          </div>
        ))}
      </div>

      {erro && <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">{erro}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <Button onClick={handleSalvar} disabled={salvando || enviandoExemplo}>
          {salvando ? "Salvando..." : editando ? "Salvar e enviar à Meta" : "Criar template"}
        </Button>
      </div>
    </div>
  )
}
