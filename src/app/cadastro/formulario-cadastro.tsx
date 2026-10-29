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
import { ConferenciaHumana } from "@/components/shared/conferencia-humana"

type FormData = DadosCadastro

/** B51-02: o formulário de cadastro, só com convite que vale (a página confere antes). */
export function FormularioCadastro({
  convite,
  emailDoConvite,
  avisoConviteInvalido,
}: {
  convite: string
  /** Convite para um e-mail: o campo vem preenchido e não muda. */
  emailDoConvite: string | null
  avisoConviteInvalido: string
}) {
  const router = useRouter()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: emailDoConvite ? { email: emailDoConvite } : undefined })
  // B50-02: a conferência do Turnstile vale para um envio só
  const [conferencia, setConferencia] = useState<string | null>(null)
  const [reinicio, setReinicio] = useState(0)

  async function onSubmit(data: FormData) {
    let resultado
    try {
      resultado = await cadastrarEmpresa({ ...data, conferencia, convite })
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
      } else if (resultado.erro === "convite_invalido") {
        setError("nomeEmpresa", { type: "manual", message: avisoConviteInvalido })
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
          readOnly={!!emailDoConvite}
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

      <ConferenciaHumana aoMudar={setConferencia} reinicio={reinicio} />

      <Button type="submit" className="mt-2 w-full">
        Criar conta
      </Button>
    </form>
  )
}
