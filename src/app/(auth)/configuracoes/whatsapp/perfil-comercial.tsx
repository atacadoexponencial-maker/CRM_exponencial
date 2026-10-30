"use client"

// Perfil comercial do número da API Oficial: o que o cliente vê ao abrir o
// contato da empresa no WhatsApp. É um botão no cartão do número que abre o
// formulário em diálogo. Só captura e exibe; limites, formato e a conversa com
// a Meta ficam nas actions.

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ImagePlus, Loader2, UserPen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CampoSelecao } from "@/app/(auth)/configuracoes/automacoes/components/campo-selecao"
import { Ajuda } from "@/components/shared/ajuda"
import {
  CATEGORIAS_PERFIL,
  FOTO_PERFIL,
  LIMITES_PERFIL,
  type PerfilComercial,
} from "@/lib/whatsapp/perfil-comercial-meta"
import { lerPerfilComercialMeta, salvarPerfilComercialMeta, trocarFotoPerfilMeta } from "./actions"

const campoTexto =
  "w-full min-h-20 rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

type Mensagem = { tipo: "erro" | "sucesso"; texto: string }

/** Botão "Editar perfil" do cartão do número da Meta. Carrega o perfil ao abrir. */
export function BotaoPerfilComercial({
  nomeExibido,
  habilitado,
}: {
  nomeExibido: string
  /** Só com o número conectado: desconectado, a Meta recusa a leitura. */
  habilitado: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [perfil, setPerfil] = useState<PerfilComercial | null>(null)
  const [erroCarregar, setErroCarregar] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  async function abrir() {
    setAberto(true)
    setPerfil(null)
    setErroCarregar(null)
    setCarregando(true)
    const r = await lerPerfilComercialMeta()
    setCarregando(false)
    if ("erro" in r) setErroCarregar(r.erro)
    else setPerfil(r.perfil)
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={!habilitado} onClick={abrir}>
        <UserPen className="size-3.5" aria-hidden />
        Editar perfil
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogPopup className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="mb-4">Perfil comercial</DialogTitle>
          {carregando && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Carregando o perfil…
            </p>
          )}
          {erroCarregar && <p className="text-sm text-erro">{erroCarregar}</p>}
          {perfil && (
            <FormularioPerfilComercial
              perfil={perfil}
              nomeExibido={nomeExibido}
              onFotoTrocada={abrir}
            />
          )}
        </DialogPopup>
      </Dialog>
    </>
  )
}

function FormularioPerfilComercial({
  perfil,
  nomeExibido,
  onFotoTrocada,
}: {
  perfil: PerfilComercial
  nomeExibido: string
  /** Recarrega o perfil para a prévia mostrar a foto nova. */
  onFotoTrocada: () => void
}) {
  const router = useRouter()
  const entradaFoto = useRef<HTMLInputElement>(null)

  const [about, setAbout] = useState(perfil.about)
  const [description, setDescription] = useState(perfil.description)
  const [address, setAddress] = useState(perfil.address)
  const [email, setEmail] = useState(perfil.email)
  const [site1, setSite1] = useState(perfil.websites[0] ?? "")
  const [site2, setSite2] = useState(perfil.websites[1] ?? "")
  const [vertical, setVertical] = useState(perfil.vertical)

  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)

  async function salvar() {
    setMensagem(null)
    setSalvando(true)
    const r = await salvarPerfilComercialMeta({
      about,
      description,
      address,
      email,
      websites: [site1, site2],
      vertical,
    })
    setSalvando(false)
    if (r.erro) {
      setMensagem({ tipo: "erro", texto: r.erro })
      return
    }
    setMensagem({ tipo: "sucesso", texto: "Perfil atualizado. Pode levar alguns minutos para aparecer no WhatsApp." })
    router.refresh()
  }

  async function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return
    setErroFoto(null)
    if (!FOTO_PERFIL.formatos.includes(arquivo.type)) {
      setErroFoto("Use JPG ou PNG.")
      return
    }
    if (arquivo.size > FOTO_PERFIL.limiteBytes) {
      setErroFoto("A imagem passa de 4 MB.")
      return
    }
    const form = new FormData()
    form.append("foto", arquivo)
    setEnviandoFoto(true)
    const r = await trocarFotoPerfilMeta(form)
    setEnviandoFoto(false)
    if (r.erro) {
      setErroFoto(r.erro)
      return
    }
    onFotoTrocada()
  }

  function contador(valor: string, max: number) {
    return (
      <span className={`text-xs ${valor.length > max ? "text-erro" : "text-muted-foreground"}`}>
        {valor.length}/{max}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-full border bg-muted/40 flex items-center justify-center">
          {perfil.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfil.fotoUrl} alt="Foto de perfil do WhatsApp" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            {nomeExibido}
            <Ajuda termo="o nome exibido">
              O nome exibido não muda por aqui: a Meta só aceita a troca pelo WhatsApp Manager, com revisão.
            </Ajuda>
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={enviandoFoto} onClick={() => entradaFoto.current?.click()}>
              {enviandoFoto && <Loader2 className="animate-spin" />}
              {perfil.fotoUrl ? "Trocar foto" : "Escolher foto"}
            </Button>
            <input
              ref={entradaFoto}
              type="file"
              accept={FOTO_PERFIL.formatos.join(",")}
              className="hidden"
              onChange={(e) => {
                escolherFoto(e.target.files?.[0])
                e.target.value = ""
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">JPG ou PNG, até 4 MB. Quadrada, ideal 640 × 640.</p>
          {erroFoto && <p className="text-xs text-erro">{erroFoto}</p>}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="perfil-about">Recado</Label>
          {contador(about, LIMITES_PERFIL.about)}
        </div>
        <Input
          id="perfil-about"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Ex.: Atacado de moda feminina. Atendemos de seg. a sex., 8h às 18h."
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="perfil-description">Descrição da empresa</Label>
          {contador(description, LIMITES_PERFIL.description)}
        </div>
        <textarea
          id="perfil-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="O que a empresa vende, para quem e como funciona o pedido."
          className={campoTexto}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="perfil-address">Endereço</Label>
          {contador(address, LIMITES_PERFIL.address)}
        </div>
        <Input id="perfil-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro, cidade e estado" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="perfil-email">E-mail</Label>
          <Input id="perfil-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@suaempresa.com.br" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perfil-vertical">Categoria</Label>
          <CampoSelecao
            id="perfil-vertical"
            valor={vertical}
            itens={CATEGORIAS_PERFIL.map((c) => ({ valor: c.valor, rotulo: c.rotulo }))}
            onMudar={setVertical}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="perfil-site1">Site</Label>
          <Input id="perfil-site1" value={site1} onChange={(e) => setSite1(e.target.value)} placeholder="https://www.suaempresa.com.br" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="perfil-site2">Segundo site (opcional)</Label>
          <Input id="perfil-site2" value={site2} onChange={(e) => setSite2(e.target.value)} placeholder="https://instagram.com/suaempresa" />
        </div>
      </div>

      {mensagem && (
        <p className={`text-sm ${mensagem.tipo === "erro" ? "text-erro" : "text-sucesso"}`} role="status">
          {mensagem.texto}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose render={<Button type="button" variant="outline" />}>Fechar</DialogClose>
        <Button onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="animate-spin" />}
          Salvar perfil
        </Button>
      </div>
    </div>
  )
}
