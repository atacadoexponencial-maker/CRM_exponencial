"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { salvarSenhaNova } from "./actions"

const ERROS = {
  senha_curta: "A senha precisa ter pelo menos 8 caracteres.",
  senhas_diferentes: "As senhas não coincidem.",
  falha: "Não foi possível salvar a senha. Tente novamente.",
} as const

/** B52-02: o formulário de senha nova; a página só o mostra com link que vale. */
export function FormularioSenhaNova({ codigo, avisoLinkInvalido }: { codigo: string; avisoLinkInvalido: string }) {
  const router = useRouter()
  const [senha, setSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    let resultado: Awaited<ReturnType<typeof salvarSenhaNova>>
    try {
      resultado = await salvarSenhaNova({ codigo, senha, confirmarSenha })
    } catch {
      resultado = { erro: "falha" }
    }
    if ("erro" in resultado) {
      setErro(resultado.erro === "link_invalido" ? avisoLinkInvalido : ERROS[resultado.erro])
      setSalvando(false)
      return
    }
    router.refresh()
    router.push("/dashboard")
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha">Senha nova</Label>
        <Input id="senha" type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmar-senha">Confirmação da senha</Label>
        <Input id="confirmar-senha" type="password" placeholder="••••••••" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} />
      </div>

      {erro && (
        <p role="alert" className="text-sm text-erro text-center">
          {erro}
        </p>
      )}

      <Button type="submit" className="mt-2 w-full" disabled={salvando}>
        {salvando ? "Salvando…" : "Salvar senha"}
      </Button>
    </form>
  )
}
