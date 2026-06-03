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
import { criarContato } from "../actions"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: z.string().min(1, "Número de WhatsApp é obrigatório"),
  tipo: z.enum(["lojista", "revendedor", "empreendedor", ""]).optional(),
  nicho: z.string().optional(),
  cidade: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NovoContatoDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", telefone: "", tipo: "", nicho: "", cidade: "" },
  })

  async function onSubmit(data: FormData) {
    setErroGeral(null)
    const resultado = await criarContato({
      nome: data.nome,
      telefone: data.telefone,
      tipo: data.tipo || null,
      nicho: data.nicho || null,
      cidade: data.cidade || null,
    })
    if (resultado.erro) {
      setErroGeral(resultado.erro)
      return
    }
    setOpen(false)
    reset()
    router.refresh()
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      reset()
      setErroGeral(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-3.5" />
        Novo contato
      </DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-4">Novo contato</DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {erroGeral && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="telefone">WhatsApp</Label>
            <Input
              id="telefone"
              type="text"
              placeholder="+55 11 99999-0000"
              aria-invalid={!!errors.telefone}
              {...register("telefone")}
            />
            {errors.telefone && <p className="text-sm text-destructive">{errors.telefone.message}</p>}
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
            <Label htmlFor="nicho">Nicho <span className="text-muted-foreground">(opcional)</span></Label>
            <Input
              id="nicho"
              type="text"
              placeholder="Ex.: Alimentação, Moda…"
              {...register("nicho")}
            />
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
