"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import {
  esquemaCompra,
  FORMAS_PAGAMENTO,
  ROTULO_FORMA_PAGAMENTO,
  type CompraEntrada,
  type CompraValidada,
} from "@/lib/compras"

// Mesmo estilo do <select> de Tipo/ICP do perfil.
const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"

interface RegistrarCompraDialogProps {
  contactId: string
  /** B30-01: usuários ativos da empresa para o seletor de atendente. */
  atendentes?: Array<{ id: string; nome: string }>
  /** B30-01: quem vem marcado ao abrir (atendente do contato, senão quem registra). */
  atendenteSugeridoId?: string | null
}

export function RegistrarCompraDialog({ contactId, atendentes = [], atendenteSugeridoId = null }: RegistrarCompraDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  const valoresIniciais: CompraEntrada = {
    data: "",
    valor: "",
    pecas: "",
    desconto: "",
    formaPagamento: "",
    atendenteId: atendenteSugeridoId ?? "",
  }

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompraEntrada, unknown, CompraValidada>({
    resolver: zodResolver(esquemaCompra),
    defaultValues: valoresIniciais,
  })

  async function onSubmit() {
    setErroGeral(null)
    // Manda o texto cru dos campos: a validação de verdade é no servidor, com o mesmo esquema.
    const resultado = await registrarCompra(contactId, getValues())
    if (resultado.erro) {
      setErroGeral(resultado.erro)
      return
    }
    setOpen(false)
    reset(valoresIniciais)
    router.refresh()
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      reset(valoresIniciais)
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="valor-compra">Valor pago (R$)</Label>
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pecas-compra">Peças</Label>
              <Input
                id="pecas-compra"
                type="number"
                step="1"
                min="0"
                placeholder="Opcional"
                aria-invalid={!!errors.pecas}
                {...register("pecas")}
              />
              {errors.pecas && <p className="text-sm text-destructive">{errors.pecas.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desconto-compra">Desconto (R$)</Label>
              <Input
                id="desconto-compra"
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional"
                aria-invalid={!!errors.desconto}
                {...register("desconto")}
              />
              {errors.desconto && <p className="text-sm text-destructive">{errors.desconto.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="forma-pagamento-compra">Forma de pagamento</Label>
            <select
              id="forma-pagamento-compra"
              className={SELECT_CLASS}
              aria-invalid={!!errors.formaPagamento}
              {...register("formaPagamento")}
            >
              <option value="">Não informada</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f} value={f}>{ROTULO_FORMA_PAGAMENTO[f]}</option>
              ))}
            </select>
            {errors.formaPagamento && <p className="text-sm text-destructive">{errors.formaPagamento.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="atendente-compra">Atendente responsável pela venda</Label>
            <select
              id="atendente-compra"
              className={SELECT_CLASS}
              {...register("atendenteId")}
            >
              <option value="">Sem atendente</option>
              {atendentes.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </select>
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
