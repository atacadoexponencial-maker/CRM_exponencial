"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { apagarTemplate, criarTemplate, editarTemplate, type Template } from "./actions"
import { CATEGORIAS, FormularioDoTemplate, IDIOMAS, type ValoresDoFormulario } from "./formulario-do-template"
import { PreviaDoTemplate } from "@/components/shared/previa-do-template"
import { PODE_EDITAR } from "@/lib/templates-da-meta"
import { avisar } from "@/lib/aviso-na-tela"

export const AVISO_EM_ANALISE = "Em análise pela Meta; só pode ser editado depois da resposta"
export const AVISO_ENVIADO_PARA_ANALISE = "Template enviado à Meta para nova análise"
export const AVISO_APAGADO = "Template apagado"

function statusBadge(status: string) {
  if (status === "APPROVED")
    return <Badge className="bg-sucesso-fundo text-sucesso border-sucesso/30">Aprovado</Badge>
  if (status === "PENDING" || status === "PENDING_DELETION")
    return <Badge className="bg-aviso-fundo text-aviso border-aviso/30">Pendente</Badge>
  if (status === "REJECTED")
    return <Badge className="bg-erro-fundo text-erro border-erro/30">Rejeitado</Badge>
  // B54-02: a Meta pausa template com qualidade baixa; ele pode ser editado.
  if (status === "PAUSED")
    return <Badge className="bg-aviso-fundo text-aviso border-aviso/30">Pausado</Badge>
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
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // B54-02: qual diálogo está aberto. `criar` abre o formulário vazio; `editar` abre
  // preenchido com o template; `apagar` abre a confirmação.
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<Template | null>(null)
  const [apagando, setApagando] = useState<Template | null>(null)
  const [apagandoPendente, setApagandoPendente] = useState(false)
  const [erroAoApagar, setErroAoApagar] = useState<string | null>(null)
  // B54-01: o template aberto no Ver.
  const [templateAberto, setTemplateAberto] = useState<Template | null>(null)

  function abrirCriar() {
    setErro(null)
    setCriando(true)
  }

  function abrirEditar(t: Template) {
    setErro(null)
    setEditando(t)
  }

  function abrirApagar(t: Template) {
    setErroAoApagar(null)
    setApagando(t)
  }

  async function handleCriar(valores: ValoresDoFormulario) {
    setSalvando(true)
    const resultado = await criarTemplate(valores)
    setSalvando(false)
    if (resultado.erro) { setErro(resultado.erro); return }

    setTemplates((prev) => [...prev, {
      id: resultado.id ?? Date.now().toString(),
      name: valores.name,
      status: "PENDING",
      category: valores.category,
      language: valores.language,
      partes: valores.partes,
    }])
    setCriando(false)
  }

  async function handleEditar(valores: ValoresDoFormulario) {
    if (!editando) return
    setSalvando(true)
    const resultado = await editarTemplate({
      id: editando.id,
      category: valores.category,
      partes: valores.partes,
      headerHandle: valores.headerHandle,
      exemplos: valores.exemplos,
    })
    setSalvando(false)
    if (resultado.erro) { setErro(resultado.erro); return }

    // Template editado volta à análise da Meta: a lista mostra Pendente até ela responder.
    setTemplates((prev) => prev.map((t) =>
      t.id === editando.id
        ? { ...t, status: "PENDING", category: valores.category, partes: valores.partes, motivo: undefined }
        : t
    ))
    setEditando(null)
    avisar(AVISO_ENVIADO_PARA_ANALISE)
  }

  async function handleApagar() {
    if (!apagando) return
    setApagandoPendente(true)
    setErroAoApagar(null)
    const resultado = await apagarTemplate(apagando.name)
    setApagandoPendente(false)
    if (resultado.erro) { setErroAoApagar(resultado.erro); return }

    // A Meta apaga pelo nome, em todos os idiomas (SUP-B54-08).
    setTemplates((prev) => prev.filter((t) => t.name !== apagando.name))
    setApagando(null)
    avisar(AVISO_APAGADO)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight">Templates de mensagem</h1>
        <Button onClick={abrirCriar}>Novo template</Button>
      </div>

      {erroAoCarregar && templates.length === 0 ? (
        <p className="rounded-md bg-erro-fundo px-4 py-3 text-sm text-erro">{erroAoCarregar}</p>
      ) : templates.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card/60 p-12 flex flex-col items-center gap-3 text-center">
          <p className="text-muted-foreground text-sm">Nenhum template criado ainda.</p>
          <Button variant="outline" onClick={abrirCriar}>Criar primeiro template</Button>
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
                    {t.status === "PENDING" && <p className="mt-1 text-xs text-muted-foreground">{AVISO_EM_ANALISE}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setTemplateAberto(t)} aria-label={`Ver ${t.name}`}>
                        Ver
                      </Button>
                      {PODE_EDITAR.has(t.status) && (
                        <Button variant="outline" size="sm" onClick={() => abrirEditar(t)} aria-label={`Editar ${t.name}`}>
                          Editar
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => abrirApagar(t)} aria-label={`Apagar ${t.name}`}>
                        Apagar
                      </Button>
                    </div>
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

      {/* B54-02: criar */}
      <Dialog open={criando} onOpenChange={setCriando}>
        <DialogPopup>
          <DialogTitle className="mb-4">Novo template</DialogTitle>
          {criando && (
            <FormularioDoTemplate salvando={salvando} erro={erro} onErro={setErro} onSalvar={handleCriar} />
          )}
        </DialogPopup>
      </Dialog>

      {/* B54-02: editar */}
      <Dialog open={editando !== null} onOpenChange={(aberto) => { if (!aberto) setEditando(null) }}>
        <DialogPopup>
          <DialogTitle className="mb-4">Editar template <span className="font-mono">{editando?.name}</span></DialogTitle>
          {editando && (
            <FormularioDoTemplate
              inicial={{ name: editando.name, category: editando.category, language: editando.language, status: editando.status, partes: editando.partes ?? null }}
              salvando={salvando}
              erro={erro}
              onErro={setErro}
              onSalvar={handleEditar}
            />
          )}
        </DialogPopup>
      </Dialog>

      {/* B54-02: apagar, com o aviso do bloqueio do nome */}
      <Dialog open={apagando !== null} onOpenChange={(aberto) => { if (!aberto) setApagando(null) }}>
        <DialogPopup>
          <DialogTitle className="mb-4">Apagar template</DialogTitle>
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              Apagar o template <strong className="font-mono">{apagando?.name}</strong>? A Meta bloqueia esse nome por 30 dias
              e recusa envios novos com ele; campanhas salvas com este template deixam de confirmar.
            </p>
            {erroAoApagar && <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">{erroAoApagar}</p>}
            <div className="flex justify-end gap-2">
              <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
              <Button variant="destructive" onClick={handleApagar} disabled={apagandoPendente}>
                {apagandoPendente ? "Apagando..." : "Apagar"}
              </Button>
            </div>
          </div>
        </DialogPopup>
      </Dialog>
    </>
  )
}
