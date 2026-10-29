"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFuso } from "@/components/shared/fuso-da-empresa"
import { avisar } from "@/lib/aviso-na-tela"
import { formatarDataEHora } from "@/lib/datas"
import {
  cancelarConvite,
  criarConvite,
  gerarLinkNovo,
  listarConvites,
  type ConviteListado,
  type Validade,
} from "./actions"

const OPCOES_DE_PRAZO = [
  { id: "1", rotulo: "1 dia" },
  { id: "7", rotulo: "7 dias" },
  { id: "30", rotulo: "30 dias" },
  { id: "personalizado", rotulo: "Escolher data" },
] as const

type Prazo = (typeof OPCOES_DE_PRAZO)[number]["id"]

const SITUACAO: Record<ConviteListado["situacao"], { rotulo: string; classe: string }> = {
  pendente: { rotulo: "Pendente", classe: "bg-aviso-fundo text-aviso border-aviso/30" },
  usado: { rotulo: "Usado", classe: "bg-sucesso-fundo text-sucesso border-sucesso/30" },
  vencido: { rotulo: "Vencido", classe: "" },
  cancelado: { rotulo: "Cancelado", classe: "" },
}

const TH = "px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"

export function ConvitesClient({ convitesIniciais }: { convitesIniciais: ConviteListado[] }) {
  const fuso = useFuso()
  const [convites, setConvites] = useState(convitesIniciais)
  const [prazo, setPrazo] = useState<Prazo>("7")
  const [dia, setDia] = useState("")
  const [hora, setHora] = useState("23:59")
  const [criando, setCriando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // O link só existe aqui, logo depois de criado (SUP-B51-02)
  const [link, setLink] = useState<string | null>(null)

  async function recarregar() {
    setConvites(await listarConvites())
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault()
    setCriando(true)
    setErro(null)
    setLink(null)
    const validade: Validade = prazo === "personalizado" ? { dia, hora } : { dias: Number(prazo) }
    const res = await criarConvite({ validade })
    setCriando(false)
    if ("erro" in res) {
      setErro(res.erro)
      return
    }
    setLink(res.link)
    await recarregar()
  }

  async function linkNovo(id: string) {
    const res = await gerarLinkNovo(id)
    if ("erro" in res) {
      avisar(res.erro)
      return
    }
    setLink(res.link)
    await recarregar()
  }

  async function cancelar(id: string) {
    const res = await cancelarConvite(id)
    if (res.erro) {
      avisar(res.erro)
      return
    }
    avisar("Convite cancelado")
    await recarregar()
  }

  async function copiar() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      avisar("Link copiado")
    } catch {
      avisar("Não foi possível copiar. Selecione o link e copie.")
    }
  }

  return (
    <>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-2">Convites</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Só quem recebe um convite consegue criar a conta de uma empresa. Cada link serve uma vez.
      </p>

      <form onSubmit={criar} className="space-y-4 max-w-xl mb-6">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-1">Validade</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {OPCOES_DE_PRAZO.map((o) => (
              <label key={o.id} className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="prazo" value={o.id} checked={prazo === o.id} onChange={() => setPrazo(o.id)} />
                {o.rotulo}
              </label>
            ))}
          </div>
          {prazo === "personalizado" && (
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label htmlFor="validade-dia">Dia</Label>
                <Input id="validade-dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="validade-hora">Hora</Label>
                <Input id="validade-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
              </div>
              <p className="text-xs text-muted-foreground pb-2">Até 90 dias.</p>
            </div>
          )}
        </fieldset>

        {erro && (
          <p role="alert" className="text-sm text-erro">
            {erro}
          </p>
        )}
        <Button type="submit" size="sm" disabled={criando}>
          {criando ? "Criando..." : "Criar convite"}
        </Button>
      </form>

      {link && (
        <section aria-label="Link do convite" className="max-w-xl mb-8 rounded-lg border p-4 space-y-2">
          <p className="text-sm font-medium">Link do convite</p>
          <div className="flex gap-2">
            <Input readOnly value={link} aria-label="Link do convite" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" size="sm" variant="outline" onClick={copiar}>
              Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copie agora: o link não aparece de novo. Se perder, gere um link novo na lista.
          </p>
        </section>
      )}

      <div className="overflow-x-auto border-t-2 border-t-foreground">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className={TH}>Convite</th>
              <th className={TH}>Situação</th>
              <th className={TH}>Vale até</th>
              <th className={TH}>Criado por</th>
              <th className={TH}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {convites.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum convite criado ainda.
                </td>
              </tr>
            )}
            {convites.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="px-4 py-3">
                  <span className="font-medium">{c.email ?? "Link avulso"}</span>
                  {c.empresa && <span className="block text-xs text-muted-foreground">Empresa: {c.empresa}</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary" className={SITUACAO[c.situacao].classe}>
                    {SITUACAO[c.situacao].rotulo}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatarDataEHora(c.expiraEm, fuso)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.criadoPor ?? "—"}
                  <span className="block text-xs">{formatarDataEHora(c.criadoEm, fuso)}</span>
                </td>
                <td className="px-4 py-3">
                  {c.situacao === "pendente" && (
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => linkNovo(c.id)}>
                        Gerar link novo
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => cancelar(c.id)}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
