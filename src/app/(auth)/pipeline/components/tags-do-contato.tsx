"use client"

// Tags do contato no painel do card (B11-12): ver, adicionar e remover sem sair
// do funil. Usa as mesmas actions do perfil do contato, que conferem as regras
// da tag (sem espaço, até 50 caracteres) e a empresa de quem está logado.

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Ajuda } from "@/components/shared/ajuda"
import { adicionarTagContato, listarTagsContato, removerTagContato } from "../../contatos/actions"

export function TagsDoContato({ contactId }: { contactId: string }) {
  const [tags, setTags] = useState<string[] | null>(null)
  const [nova, setNova] = useState("")
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [comEspaco, setComEspaco] = useState(false)

  useEffect(() => {
    let descartar = false
    listarTagsContato(contactId)
      .then((lista) => !descartar && setTags(lista))
      .catch(() => !descartar && setTags([]))
    return () => {
      descartar = true
    }
  }, [contactId])

  async function adicionar() {
    const tag = nova.trim()
    if (!tag) return
    setSalvando(true)
    setErro(null)
    const resultado = await adicionarTagContato(contactId, tag)
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setNova("")
    setComEspaco(false)
    setTags(await listarTagsContato(contactId))
  }

  async function remover(tag: string) {
    setErro(null)
    const resultado = await removerTagContato(contactId, tag)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setTags((atuais) => (atuais ?? []).filter((t) => t !== tag))
  }

  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        Tags
        <Ajuda termo="Tag">
          A tag fica no contato e aparece em todos os cards e conversas dele; serve para filtrar os contatos. É diferente da etiqueta, que marca só a conversa no Chat.
        </Ajuda>
      </p>
      {tags === null ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : tags.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma tag</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-1.5 py-px text-[11px] text-muted-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => remover(tag)}
                className="transition-colors hover:text-foreground"
                aria-label={`Remover tag ${tag}`}
              >
                <X className="size-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <Input
          aria-label="Nova tag"
          placeholder="Nova tag (sem espaços)"
          value={nova}
          maxLength={50}
          disabled={salvando}
          className="h-7 text-xs"
          onChange={(e) => {
            // B48-15: tag não tem espaço; o espaço não entra, e a dica diz por quê
            const digitado = e.target.value
            setComEspaco(/\s/.test(digitado))
            setNova(digitado.replace(/\s/g, ""))
            setErro(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void adicionar()
            }
          }}
        />
        <Button type="button" size="xs" variant="outline" disabled={!nova.trim() || salvando} onClick={adicionar}>
          Adicionar
        </Button>
      </div>
      {comEspaco && !erro && <p className="text-xs text-muted-foreground">Tags não têm espaço</p>}
      {erro && <p className="text-xs text-destructive">{erro}</p>}
    </div>
  )
}
