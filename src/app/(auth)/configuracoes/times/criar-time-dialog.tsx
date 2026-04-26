"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { criarTime } from "./actions"

const schema = z.object({
  nome: z.string().trim().min(1, "Nome é obrigatório"),
})

type FormData = z.infer<typeof schema>

export function CriarTimeDialog() {
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
  })

  async function onSubmit(data: FormData) {
    setErroGeral(null)
    const resultado = await criarTime(data.nome)
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
      <DialogTrigger render={<Button />}>Criar time</DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-4">Criar time</DialogTitle>

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
              placeholder="Ex: Pós-venda"
              aria-invalid={!!errors.nome}
              {...register("nome")}
            />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
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
