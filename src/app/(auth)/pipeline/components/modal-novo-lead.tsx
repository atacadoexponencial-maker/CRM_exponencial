"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { criarNovoLead } from "../actions"

const schema = z.object({
  telefone: z.string().min(1, "Número de WhatsApp é obrigatório"),
  nome: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ModalNovoLeadProps {
  onSucesso: () => void
  onFechar: () => void
}

export function ModalNovoLead({ onSucesso, onFechar }: ModalNovoLeadProps) {
  const [erroGeral, setErroGeral] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setErroGeral(null)
    try {
      await criarNovoLead(data.telefone, data.nome ?? null)
      onSucesso()
    } catch {
      setErroGeral("Não foi possível criar o lead. Tente novamente.")
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onFechar} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold">Novo lead</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="telefone">Número de WhatsApp *</Label>
            <Input
              id="telefone"
              placeholder="+55 11 99999-9999"
              {...register("telefone")}
            />
            {errors.telefone && (
              <p className="text-xs text-destructive">{errors.telefone.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome do contato (opcional)</Label>
            <Input
              id="nome"
              placeholder="Ex: Padaria do Centro"
              {...register("nome")}
            />
          </div>

          {erroGeral && (
            <p className="text-xs text-destructive">{erroGeral}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onFechar}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar lead"}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}
