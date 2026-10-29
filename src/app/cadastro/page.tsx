"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cadastrarEmpresa } from "./actions"
import { schema, type DadosCadastro } from "./schema"
import { AVISO_MUITAS_TENTATIVAS } from "../login/avisos"
import { TemaClaro } from "@/components/shared/tema-claro"
import { LogoDaMarca } from "@/components/shared/logo-da-marca"
import { ConferenciaHumana } from "@/components/shared/conferencia-humana"

export { schema }

type FormData = DadosCadastro

export default function CadastroPage() {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })
  // B50-02: a conferência do Turnstile vale para um envio só
  const [conferencia, setConferencia] = useState<string | null>(null)
  const [reinicio, setReinicio] = useState(0)
  // Enquanto a Cloudflare confere, o botão espera em vez de mandar sem a conferência
  const [conferindo, setConferindo] = useState(true)

  async function onSubmit(data: FormData) {
    let resultado
    try {
      resultado = await cadastrarEmpresa({ ...data, conferencia })
    } catch {
      resultado = { erro: "falha" as const }
    }

    if ("erro" in resultado) {
      setReinicio((r) => r + 1)
      if (resultado.erro === "email_em_uso") {
        setError("email", { type: "manual", message: "E-mail já está em uso" })
      } else if (resultado.erro === "limite") {
        setError("nomeEmpresa", { type: "manual", message: AVISO_MUITAS_TENTATIVAS })
      } else if (resultado.erro === "conferencia") {
        setError("nomeEmpresa", { type: "manual", message: "Não foi possível confirmar que você é uma pessoa. Tente de novo." })
      } else if (resultado.erro === "falha_login") {
        router.push("/login")
      } else {
        setError("nomeEmpresa", { type: "manual", message: "Não foi possível concluir o cadastro. Tente novamente." })
      }
      return
    }

    router.refresh()
    router.push("/configuracoes/whatsapp")
  }

  return (
    <TemaClaro>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <LogoDaMarca className="mx-auto mb-6 h-16" />
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Cadastre sua empresa no crmatacado exp
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
              <p className="text-sm text-erro">{errors.nomeEmpresa.message}</p>
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
              <p className="text-sm text-erro">{errors.nomeResponsavel.message}</p>
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
              <p className="text-sm text-erro">{errors.email.message}</p>
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
              <p className="text-sm text-erro">{errors.senha.message}</p>
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
              <p className="text-sm text-erro">{errors.confirmarSenha.message}</p>
            )}
          </div>

          <ConferenciaHumana aoMudar={setConferencia} aoAguardar={setConferindo} reinicio={reinicio} />

          <Button type="submit" className="mt-2 w-full" disabled={conferindo || isSubmitting}>
            {conferindo ? "Conferindo…" : "Criar conta"}
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
    </TemaClaro>
  )
}
