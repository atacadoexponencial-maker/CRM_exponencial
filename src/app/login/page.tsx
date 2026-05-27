"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/integrations/supabase/client"

const schema = z.object({
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.senha,
    })
    if (error) {
      setError("root", { type: "manual", message: "E-mail ou senha incorretos" })
      return
    }
    router.push("/configuracoes/usuarios")
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

          {errors.root && (
            <p className="text-sm text-destructive text-center">{errors.root.message}</p>
          )}

          <Button type="submit" className="mt-2 w-full">
            Entrar
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
