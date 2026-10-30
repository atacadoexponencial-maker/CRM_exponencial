"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { criarTemplate, type Template } from "./actions"
import { conferirNomeDoTemplate, nomeFinalDoTemplate } from "./nome-do-template"
import { PreviaDoTemplate } from "@/components/shared/previa-do-template"

const CATEGORIAS = [
  { value: "MARKETING", label: "Marketing" },
  { value: "UTILITY", label: "Utilidade" },
  { value: "AUTHENTICATION", label: "Autenticação" },
]

const IDIOMAS = [
  { value: "pt_BR", label: "Português (Brasil)" },
  { value: "en_US", label: "Inglês (EUA)" },
  { value: "es", label: "Espanhol" },
]

function statusBadge(status: string) {
  if (status === "APPROVED")
    return <Badge className="bg-sucesso-fundo text-sucesso border-sucesso/30">Aprovado</Badge>
  if (status === "PENDING" || status === "PENDING_DELETION")
    return <Badge className="bg-aviso-fundo text-aviso border-aviso/30">Pendente</Badge>
  if (status === "REJECTED")
    return <Badge className="bg-erro-fundo text-erro border-erro/30">Rejeitado</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function TemplatesClient({
  templates: initial,
  erroAoCarregar,
}: {
  templates: Template[]
  /** B53-08: a Meta recusou a consulta; a tela diz isso em vez de mostrar lista vazia. */
  erroAoCarregar?: string
}) {
  const [templates, setTemplates] = useState(initial)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  // B54-01: o template aberto no Ver.
  const [templateAberto, setTemplateAberto] = useState<Template | null>(null)

  const [name, setName] = useState("")
  const [category, setCategory] = useState("MARKETING")
  const [language, setLanguage] = useState("pt_BR")
  const [body, setBody] = useState("")

  function abrirDialog() {
    setName("")
    setCategory("MARKETING")
    setLanguage("pt_BR")
    setBody("")
    setErro(null)
    setDialogAberto(true)
  }

  async function handleSalvar() {
    const conferido = conferirNomeDoTemplate(name)
    if ("erro" in conferido) { setErro(conferido.erro); return }
    const nomeLimpo = conferido.nome
    if (!body.trim()) { setErro("Corpo da mensagem é obrigatório"); return }

    setErro(null)
    setSalvando(true)
    const resultado = await criarTemplate({ name: nomeLimpo, category, language, body: body.trim() })
    setSalvando(false)

    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }

    setTemplates(prev => [...prev, {
      id: Date.now().toString(),
      name: nomeLimpo,
      status: "PENDING",
      category,
      language,
      partes: { cabecalho: null, corpo: body.trim(), rodape: null, botoes: [] },
    }])
    setDialogAberto(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Templates de mensagem</h1>
        <Button onClick={abrirDialog}>Novo template</Button>
      </div>

      {erroAoCarregar && templates.length === 0 ? (
        <p className="rounded-md bg-erro-fundo px-4 py-3 text-sm text-erro">{erroAoCarregar}</p>
      ) : templates.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card/60 p-12 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm">Nenhum template criado ainda.</p>
          <Button variant="outline" onClick={abrirDialog}>Criar primeiro template</Button>
        </div>
      ) : (
        <div className="overflow-x-auto border-t-2 border-t-foreground">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Idioma</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr key={t.id} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-4 py-3 font-mono">{t.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {CATEGORIAS.find(c => c.value === t.category)?.label ?? t.category}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {IDIOMAS.find(l => l.value === t.language)?.label ?? t.language}
                  </td>
                  <td className="px-4 py-3">
                    {statusBadge(t.status)}
                    {t.motivo && <p className="mt-1 text-xs text-muted-foreground">{t.motivo}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => setTemplateAberto(t)} aria-label={`Ver ${t.name}`}>
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* B54-01: prévia do template como no WhatsApp */}
      <Dialog open={templateAberto !== null} onOpenChange={(aberto) => { if (!aberto) setTemplateAberto(null) }}>
        <DialogPopup>
          <DialogTitle className="mb-1 font-mono">{templateAberto?.name}</DialogTitle>
          <p className="mb-4 text-xs text-muted-foreground">
            {CATEGORIAS.find(c => c.value === templateAberto?.category)?.label ?? templateAberto?.category}
            {" · "}
            {IDIOMAS.find(l => l.value === templateAberto?.language)?.label ?? templateAberto?.language}
          </p>
          <PreviaDoTemplate partes={templateAberto?.partes ?? null} />
          <div className="flex justify-end pt-4">
            <DialogClose render={<Button type="button" variant="outline" />}>Fechar</DialogClose>
          </div>
        </DialogPopup>
      </Dialog>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogPopup>
          <DialogTitle className="mb-4">Novo template</DialogTitle>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="meu_template_1"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Apenas letras minúsculas, números e underscores.</p>
              {nomeFinalDoTemplate(name) && (
                <p className="text-xs text-muted-foreground">
                  Será enviado como <span className="font-mono text-foreground">{nomeFinalDoTemplate(name)}</span>
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="categoria">Categoria</Label>
                <select
                  id="categoria"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CATEGORIAS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="idioma">Idioma</Label>
                <select
                  id="idioma"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {IDIOMAS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="corpo">Corpo da mensagem</Label>
              <textarea
                id="corpo"
                rows={4}
                placeholder="Olá {{1}}, tudo bem? Seu pedido {{2}} está pronto!"
                value={body}
                onChange={e => setBody(e.target.value)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">Use {"{{1}}"}, {"{{2}}"} para variáveis dinâmicas.</p>
            </div>

            {erro && (
              <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">{erro}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button onClick={handleSalvar} disabled={salvando}>
                {salvando ? "Criando..." : "Criar template"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
