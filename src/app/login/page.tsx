"use client"

import { use, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { realizarLogin } from "./actions"
import { AVISO_CONTA_DESATIVADA } from "./avisos"

const schema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
})

type FormData = z.infer<typeof schema>

export default function LoginPage({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  // B20-02: o middleware manda para cá quem foi desativado com a sessão aberta.
  const { motivo } = use(searchParams)
  // Fica ligado do clique até a página seguinte abrir: o redirect da action
  // troca de tela sozinho, então só o erro desliga.
  const [entrando, setEntrando] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setEntrando(true)
    try {
      const resultado = await realizarLogin(data.email, data.senha)
      if (resultado?.erro) {
        setError("root", { type: "manual", message: resultado.erro })
        setEntrando(false)
      }
    } catch {
      setError("root", { type: "manual", message: "Não foi possível entrar. Tente novamente." })
      setEntrando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Acesse sua conta no CRM Exponencial
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="joao@empresa.com"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.senha}
              {...register("senha")}
            />
            {errors.senha && (
              <p className="text-sm text-destructive">{errors.senha.message}</p>
            )}
          </div>

          {motivo === "desativada" && !errors.root && (
            <p className="text-sm text-destructive text-center">{AVISO_CONTA_DESATIVADA}</p>
          )}

          {errors.root && (
            <p className="text-sm text-destructive text-center">{errors.root.message}</p>
          )}

          <Button type="submit" className="mt-2 w-full" disabled={entrando}>
            {entrando && <Loader2 className="size-4 animate-spin" />}
            {entrando ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <a href="/cadastro" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
            Criar conta
          </a>
        </p>
      </div>
    </div>
  )
}
