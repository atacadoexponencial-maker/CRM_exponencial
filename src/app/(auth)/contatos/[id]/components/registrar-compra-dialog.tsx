"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ShoppingBag } from "lucide-react"
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
import { registrarCompra } from "../../actions"

const schema = z.object({
  data: z.string().min(1, "Data é obrigatória"),
  valor: z.string().min(1, "Valor é obrigatório").transform((v) => parseFloat(v.replace(",", "."))).refine((v) => !isNaN(v) && v > 0, "Valor deve ser maior que zero"),
})

type FormInput = z.input<typeof schema>
type FormOutput = z.output<typeof schema>

interface RegistrarCompraDialogProps {
  contactId: string
}

export function RegistrarCompraDialog({ contactId }: RegistrarCompraDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: { data: "", valor: "" },
  })

  async function onSubmit(data: FormOutput) {
    setErroGeral(null)
    const resultado = await registrarCompra(contactId, { data: data.data, valor: data.valor })
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
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <ShoppingBag className="size-3.5" />
        Registrar compra
      </DialogTrigger>
      <DialogPopup>
        <DialogTitle className="mb-4">Registrar compra</DialogTitle>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {erroGeral && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {erroGeral}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="data-compra">Data</Label>
            <Input
              id="data-compra"
              type="date"
              aria-invalid={!!errors.data}
              {...register("data")}
            />
            {errors.data && <p className="text-sm text-destructive">{errors.data.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="valor-compra">Valor (R$)</Label>
            <Input
              id="valor-compra"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              aria-invalid={!!errors.valor}
              {...register("valor")}
            />
            {errors.valor && <p className="text-sm text-destructive">{errors.valor.message}</p>}
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
