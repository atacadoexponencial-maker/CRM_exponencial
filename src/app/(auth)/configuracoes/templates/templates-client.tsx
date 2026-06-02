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
    return <Badge className="bg-green-100 text-green-700 border-green-200">Aprovado</Badge>
  if (status === "PENDING" || status === "PENDING_DELETION")
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendente</Badge>
  if (status === "REJECTED")
    return <Badge className="bg-red-100 text-red-700 border-red-200">Rejeitado</Badge>
  return <Badge variant="outline">{status}</Badge>
}

export function TemplatesClient({ templates: initial }: { templates: Template[] }) {
  const [templates, setTemplates] = useState(initial)
  const [dialogAberto, setDialogAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

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
    const nomeLimpo = name.trim().toLowerCase().replace(/\s+/g, "_")
    if (!nomeLimpo) { setErro("Nome é obrigatório"); return }
    if (!/^[a-z0-9_]+$/.test(nomeLimpo)) {
      setErro("Nome deve conter apenas letras minúsculas, números e underscores")
      return
    }
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
    }])
    setDialogAberto(false)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Templates de mensagem</h1>
        <Button onClick={abrirDialog}>Novo template</Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm">Nenhum template criado ainda.</p>
          <Button variant="outline" onClick={abrirDialog}>Criar primeiro template</Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nome</th>
                <th className="text-left px-4 py-3 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 font-medium">Idioma</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
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
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{erro}</p>
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
