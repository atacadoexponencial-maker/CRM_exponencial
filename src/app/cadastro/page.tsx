"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const schema = z.object({
  nomeEmpresa: z.string().min(1, "Nome da empresa é obrigatório"),
  nomeResponsavel: z.string().min(1, "Nome do responsável é obrigatório"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmarSenha: z.string().min(1, "Confirmação de senha é obrigatória"),
})

type FormData = z.infer<typeof schema>

export default function CadastroPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function onSubmit(_data: FormData) {
    // submissão ao Supabase é escopo de outra issue
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Cadastre sua empresa no CRM Exponencial
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-empresa">Nome da empresa</Label>
            <Input
              id="nome-empresa"
              type="text"
              placeholder="Empresa Ltda"
              aria-invalid={!!errors.nomeEmpresa}
              {...register("nomeEmpresa")}
            />
            {errors.nomeEmpresa && (
              <p className="text-sm text-destructive">{errors.nomeEmpresa.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-responsavel">Nome do responsável</Label>
            <Input
              id="nome-responsavel"
              type="text"
              placeholder="João Silva"
              aria-invalid={!!errors.nomeResponsavel}
              {...register("nomeResponsavel")}
            />
            {errors.nomeResponsavel && (
              <p className="text-sm text-destructive">{errors.nomeResponsavel.message}</p>
            )}
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmar-senha">Confirmação de senha</Label>
            <Input
              id="confirmar-senha"
              type="password"
              placeholder="••••••••"
              aria-invalid={!!errors.confirmarSenha}
              {...register("confirmarSenha")}
            />
            {errors.confirmarSenha && (
              <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>
            )}
          </div>

          <Button type="submit" className="mt-2 w-full">
            Criar conta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <a href="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}
