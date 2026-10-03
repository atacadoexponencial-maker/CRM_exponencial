"use client"

import { useState } from "react"
import { Check, Copy, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogClose, DialogDescription, DialogPopup, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type TipoMinimo = "nenhum" | "pecas" | "valor"

export interface ConfigCatalogo {
  endereco: string
  conexaoId: string | null
  minimo: { tipo: TipoMinimo; valor: number | null }
  mensagemFechamento: string
  publicado: boolean
}

export interface NumeroConectado {
  id: string
  rotulo: string
}

/** Endereço da loja: minúsculas, números e hífen, sem acento. */
export function normalizarEndereco(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
}

interface FormConfiguracoesProps {
  inicial: ConfigCatalogo
  numeros: NumeroConectado[]
  /** Ex.: "https://crm-exponencial.vercel.app/loja/" */
  prefixoLink: string
  onVerificarEndereco: (endereco: string) => Promise<"disponivel" | "em_uso">
  onSalvar: (config: ConfigCatalogo) => Promise<{ erro?: string; aviso?: string }>
}

export function FormConfiguracoes({ inicial, numeros, prefixoLink, onVerificarEndereco, onSalvar }: FormConfiguracoesProps) {
  const [config, setConfig] = useState<ConfigCatalogo>(inicial)
  const [disponibilidade, setDisponibilidade] = useState<"disponivel" | "em_uso" | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "aviso"; texto: string } | null>(null)
  const [confirmarTroca, setConfirmarTroca] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const enderecoValido = config.endereco.length >= 3 && config.endereco.length <= 40 && !config.endereco.startsWith("-") && !config.endereco.endsWith("-")
  const link = prefixoLink + (config.endereco || "seu-endereco")
  const faltaParaPublicar = [
    !enderecoValido && "o endereço da loja",
    !config.conexaoId && "o número que recebe os pedidos",
  ].filter(Boolean) as string[]
  const trocouEnderecoPublicado = inicial.publicado && inicial.endereco !== "" && config.endereco !== inicial.endereco

  function mudar<K extends keyof ConfigCatalogo>(campo: K, valor: ConfigCatalogo[K]) {
    setConfig((atual) => ({ ...atual, [campo]: valor }))
    setMensagem(null)
  }

  async function verificar(endereco: string) {
    setDisponibilidade(null)
    if (endereco.length < 3 || endereco === inicial.endereco) return
    setDisponibilidade(await onVerificarEndereco(endereco))
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setMensagem({ tipo: "erro", texto: "Não deu para copiar. Selecione o link e copie à mão." })
    }
  }

  async function salvar(confirmado = false) {
    if (config.endereco && !enderecoValido) {
      setMensagem({ tipo: "erro", texto: "O endereço precisa ter de 3 a 40 caracteres e não pode começar nem terminar com hífen." })
      return
    }
    if (disponibilidade === "em_uso") {
      setMensagem({ tipo: "erro", texto: "Esse endereço já é de outra loja. Escolha outro." })
      return
    }
    if (config.minimo.tipo !== "nenhum" && !(config.minimo.valor && config.minimo.valor > 0)) {
      setMensagem({ tipo: "erro", texto: "Informe o valor do pedido mínimo, maior que zero." })
      return
    }
    if (config.publicado && faltaParaPublicar.length > 0) {
      setMensagem({ tipo: "erro", texto: `Para publicar, falta escolher ${faltaParaPublicar.join(" e ")}.` })
      return
    }
    if (trocouEnderecoPublicado && !confirmado) {
      setConfirmarTroca(true)
      return
    }
    setSalvando(true)
    const r = await onSalvar(config)
    setSalvando(false)
    if (r.erro) setMensagem({ tipo: "erro", texto: r.erro })
    else if (r.aviso) setMensagem({ tipo: "aviso", texto: r.aviso })
  }

  const campoTexto = "w-full min-h-20 rounded-lg border border-input bg-input/30 px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-y"

  return (
    <div className="space-y-6 max-w-2xl">
      {mensagem && (
        <p role="status" className={cn("rounded-lg border px-3 py-2 text-sm", mensagem.tipo === "erro" ? "border-destructive/40 text-destructive" : "border-emerald-500/40 text-emerald-300")}>
          {mensagem.texto}
        </p>
      )}

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Endereço da loja</h2>
        <div className="flex items-center rounded-lg border border-input bg-input/30 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="pl-2.5 text-sm text-muted-foreground whitespace-nowrap">{prefixoLink}</span>
          <input
            value={config.endereco}
            onChange={(e) => { const v = normalizarEndereco(e.target.value); mudar("endereco", v); setDisponibilidade(null) }}
            onBlur={(e) => verificar(e.target.value)}
            placeholder="nome-da-loja"
            className="h-8 flex-1 min-w-0 bg-transparent pr-2.5 text-sm outline-none"
            aria-label="Endereço da loja"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {disponibilidade === "disponivel" && <span className="text-emerald-300">Disponível</span>}
          {disponibilidade === "em_uso" && <span className="text-destructive">Já está em uso por outra loja</span>}
          <span className="text-muted-foreground">Só letras minúsculas, números e hífen.</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate">{link}</span>
          <Button size="sm" variant="outline" onClick={copiar} disabled={!enderecoValido}>
            {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copiado ? "Copiado" : "Copiar link"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">WhatsApp que recebe os pedidos</h2>
        {numeros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum número conectado. Conecte um número em Configurações › WhatsApp.</p>
        ) : (
          <select
            value={config.conexaoId ?? ""}
            onChange={(e) => mudar("conexaoId", e.target.value || null)}
            className="h-8 w-full rounded-lg border border-input bg-input/30 px-2 text-sm"
            aria-label="Número que recebe os pedidos"
          >
            <option value="">Escolha um número</option>
            {numeros.map((n) => <option key={n.id} value={n.id}>{n.rotulo}</option>)}
          </select>
        )}
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Pedido mínimo</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {([
            ["nenhum", "Sem mínimo"],
            ["pecas", "Mínimo de peças"],
            ["valor", "Mínimo em reais"],
          ] as [TipoMinimo, string][]).map(([tipo, rotulo]) => (
            <label key={tipo} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="minimo"
                checked={config.minimo.tipo === tipo}
                onChange={() => mudar("minimo", { tipo, valor: tipo === "nenhum" ? null : config.minimo.valor })}
                className="accent-primary"
              />
              {rotulo}
            </label>
          ))}
        </div>
        {config.minimo.tipo !== "nenhum" && (
          <div className="flex items-center gap-2">
            {config.minimo.tipo === "valor" && <span className="text-sm text-muted-foreground">R$</span>}
            <Input
              type="number"
              min={1}
              value={config.minimo.valor ?? ""}
              onChange={(e) => mudar("minimo", { ...config.minimo, valor: e.target.value === "" ? null : Number(e.target.value) })}
              className="w-32"
              aria-label={config.minimo.tipo === "pecas" ? "Mínimo de peças" : "Mínimo em reais"}
            />
            {config.minimo.tipo === "pecas" && <span className="text-sm text-muted-foreground">peças no pedido</span>}
          </div>
        )}
      </section>

      <section className="rounded-lg border p-4 space-y-2">
        <Label htmlFor="fechamento">Mensagem de fechamento (opcional)</Label>
        <textarea
          id="fechamento"
          value={config.mensagemFechamento}
          onChange={(e) => mudar("mensagemFechamento", e.target.value)}
          placeholder="Ex.: Formas de pagamento: Pix e boleto. Enviamos para todo o Brasil."
          className={campoTexto}
        />
        <p className="text-xs text-muted-foreground">Vai no fim da mensagem do pedido que chega no WhatsApp.</p>
      </section>

      <section className="rounded-lg border p-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Catálogo publicado</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {config.publicado
              ? "A loja está aberta no link acima."
              : faltaParaPublicar.length > 0
                ? `Para publicar, falta escolher ${faltaParaPublicar.join(" e ")}.`
                : "Desligado, o link mostra \"Catálogo indisponível no momento\"."}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={config.publicado} onChange={(e) => mudar("publicado", e.target.checked)} className="accent-primary size-4" />
          {config.publicado ? "Publicado" : "Despublicado"}
        </label>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => salvar()} disabled={salvando}>{salvando ? "Salvando..." : "Salvar configurações"}</Button>
      </div>

      <Dialog open={confirmarTroca} onOpenChange={setConfirmarTroca}>
        <DialogPopup className="max-w-sm">
          <DialogTitle>Trocar o endereço da loja?</DialogTitle>
          <DialogDescription className="mt-2">
            O link antigo ({prefixoLink + inicial.endereco}) deixa de funcionar. Quem já recebeu esse link vai ver &quot;Catálogo indisponível&quot;.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button size="sm" onClick={() => { setConfirmarTroca(false); salvar(true) }}>Trocar endereço</Button>
          </div>
        </DialogPopup>
      </Dialog>
    </div>
  )
}
