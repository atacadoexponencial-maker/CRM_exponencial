"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { alterarSenha } from "./actions"

export function FormAlterarSenha() {
  const [senhaAtual, setSenhaAtual] = useState("")
  const [novaSenha, setNovaSenha] = useState("")
  const [confirmarSenha, setConfirmarSenha] = useState("")
  const [alterando, setAlterando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSucesso(false)
    setAlterando(true)
    const resultado = await alterarSenha(senhaAtual, novaSenha, confirmarSenha)
    setAlterando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    setSenhaAtual("")
    setNovaSenha("")
    setConfirmarSenha("")
    setSucesso(true)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="senha-atual">Senha atual</Label>
        <Input
          id="senha-atual"
          type="password"
          placeholder="••••••••"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nova-senha">Nova senha</Label>
        <Input
          id="nova-senha"
          type="password"
          placeholder="••••••••"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmar-nova-senha">Confirmar nova senha</Label>
        <Input
          id="confirmar-nova-senha"
          type="password"
          placeholder="••••••••"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          required
        />
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      {sucesso && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
          Senha alterada com sucesso.
        </p>
      )}

      <div>
        <Button type="submit" disabled={alterando}>
          {alterando ? "Alterando..." : "Alterar senha"}
        </Button>
      </div>
    </form>
  )
}
