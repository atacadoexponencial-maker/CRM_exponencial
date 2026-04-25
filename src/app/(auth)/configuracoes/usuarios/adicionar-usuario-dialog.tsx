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
import { adicionarUsuario } from "./actions"

const schema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  papel: z.enum(["gerente", "atendente"], { error: "Papel é obrigatório" }),
  times: z.array(z.string()),
})

type FormData = z.infer<typeof schema>

type Team = { id: string; name: string }

export function AdicionarUsuarioDialog({
  times,
}: {
  times: Team[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { times: [] },
  })

  const timesSelecionados = watch("times")

  function toggleTime(id: string) {
    const atual = timesSelecionados ?? []
    if (atual.includes(id)) {
      setValue("times", atual.filter((t) => t !== id))
    } else {
      setValue("times", [...atual, id])
    }
  }

  async function onSubmit(data: FormData) {
    setErroGeral(null)
    const resultado = await adicionarUsuario(data)
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
      <DialogTrigger render={<Button />}>Adicionar usuário</DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-4">Adicionar usuário</DialogTitle>

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
              placeholder="João Silva"
              aria-invalid={!!errors.nome}
              {...register("nome")}
            />
            {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao@empresa.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha temporária</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.senha}
              {...register("senha")}
            />
            {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="papel">Papel</Label>
            <select
              id="papel"
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-invalid={!!errors.papel}
              {...register("papel")}
            >
              <option value="">Selecione um papel</option>
              <option value="gerente">Gerente</option>
              <option value="atendente">Atendente</option>
            </select>
            {errors.papel && <p className="text-sm text-destructive">{errors.papel.message}</p>}
          </div>

          {times.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Times</Label>
              <div className="flex flex-col gap-2">
                {times.map((time) => (
                  <label key={time.id} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={timesSelecionados?.includes(time.id) ?? false}
                      onChange={() => toggleTime(time.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    {time.name}
                  </label>
                ))}
              </div>
            </div>
          )}

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
