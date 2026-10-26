"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { criarContato, verificarNumeroDuplicado } from "../actions"
import { UFS } from "@/lib/uf"
import { EntradaCampoPersonalizado } from "@/components/shared/entrada-campo-personalizado"
import { conferirValor, type CampoPersonalizado, type EntradaDoCampo } from "@/lib/campos-personalizados"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: z.string().min(1, "Número de WhatsApp é obrigatório"),
  tipo: z.enum(["lojista", "revendedor", "empreendedor", ""]).optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NovoContatoDialog({ campos = [] }: { campos?: CampoPersonalizado[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [valoresCampos, setValoresCampos] = useState<Record<string, EntradaDoCampo>>({})
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroTelefone, setErroTelefone] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", telefone: "", tipo: "", cidade: "", uf: "" },
  })

  async function onSubmit(data: FormData) {
    setErroGeral(null)
    // B38-02: confere os campos na tela para apontar na hora; o servidor confere de novo.
    const daTela: Record<string, string> = {}
    for (const c of campos) {
      const conferido = conferirValor(c, valoresCampos[c.id] ?? null)
      if ("erro" in conferido) daTela[c.id] = conferido.erro
    }
    setErrosCampos(daTela)
    if (Object.keys(daTela).length > 0) return

    const resultado = await criarContato({
      nome: data.nome,
      telefone: data.telefone,
      tipo: data.tipo || null,
      cidade: data.cidade || null,
      uf: data.uf || null,
      ...(campos.length > 0 ? { campos: valoresCampos } : {}),
    })
    if (resultado.erros) {
      setErrosCampos(resultado.erros)
      return
    }
    if (resultado.erro) {
      setErroGeral(resultado.erro)
      return
    }
    reset()
    setValoresCampos({})
    router.refresh()
    // QA M11 (06/10): número que estava na lixeira volta com os dados antigos; o nome
    // digitado não vale, e a pessoa precisa saber.
    if (resultado.restaurado) {
      setAviso("Esse número estava na lixeira. O contato antigo voltou, com o nome e os dados de antes.")
      return
    }
    setOpen(false)
  }

  async function handleTelefoneBlur(e: React.FocusEvent<HTMLInputElement>) {
    const valor = e.target.value.trim()
    if (!valor) return
    const duplicado = await verificarNumeroDuplicado(valor)
    if (duplicado) setErroTelefone("Número já cadastrado neste workspace")
  }

  function handleTelefoneChange(e: React.FocusEvent<HTMLInputElement>) {
    if (erroTelefone) setErroTelefone(null)
    register("telefone").onChange(e)
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      reset()
      setErroGeral(null)
      setErroTelefone(null)
      setValoresCampos({})
      setErrosCampos({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-3.5" />
        Novo contato
      </DialogTrigger>
      <DialogPopup className="max-h-[90dvh] overflow-y-auto">
        <DialogTitle className="mb-4">Novo contato</DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {aviso && (
            <p className="rounded-md bg-aviso-fundo px-3 py-2 text-sm text-aviso" role="status">
              {aviso}
            </p>
          )}
          {erroGeral && (
            <p className="rounded-md bg-erro-fundo px-3 py-2 text-sm text-erro">
              {erroGeral}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              type="text"
              placeholder="Nome do contato"
              aria-invalid={!!errors.nome}
              {...register("nome")}
            />
            {errors.nome && <p className="text-sm text-erro">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telefone">WhatsApp</Label>
            <Input
              id="telefone"
              type="text"
              placeholder="+55 11 99999-0000"
              aria-invalid={!!errors.telefone || !!erroTelefone}
              {...register("telefone")}
              onBlur={handleTelefoneBlur}
              onChange={handleTelefoneChange}
            />
            {errors.telefone && <p className="text-sm text-erro">{errors.telefone.message}</p>}
            {!errors.telefone && erroTelefone && <p className="text-sm text-erro">{erroTelefone}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tipo">Tipo <span className="text-muted-foreground">(opcional)</span></Label>
            <select
              id="tipo"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("tipo")}
            >
              <option value="">Selecione um tipo</option>
              <option value="lojista">Lojista</option>
              <option value="revendedor">Revendedor</option>
              <option value="empreendedor">Empreendedor</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cidade">Cidade <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              id="cidade"
              type="text"
              placeholder="Ex.: São Paulo"
              {...register("cidade")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="uf">UF <span className="text-muted-foreground">(opcional)</span></Label>
            <select id="uf" className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" {...register("uf")}>
              <option value="">Sem UF</option>
              {UFS.map((u) => (
                <option key={u.sigla} value={u.sigla}>{u.sigla} · {u.nome}</option>
              ))}
            </select>
          </div>

          {/* B38-02: campos personalizados da empresa, todos opcionais, na ordem dela. */}
          {campos.map((c) => (
            <div key={c.id} className="flex flex-col gap-1.5">
              <Label htmlFor={`novo-campo-${c.id}`}>{c.nome} <span className="text-muted-foreground">(opcional)</span></Label>
              <EntradaCampoPersonalizado
                id={`novo-campo-${c.id}`}
                campo={c}
                valor={valoresCampos[c.id] ?? null}
                onChange={(v) => setValoresCampos((atual) => ({ ...atual, [c.id]: v }))}
                erro={errosCampos[c.id]}
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
