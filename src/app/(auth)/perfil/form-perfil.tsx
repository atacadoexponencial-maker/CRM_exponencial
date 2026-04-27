"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { editarNomePerfil } from "./actions"

export function FormPerfil({ nome, email }: { nome: string; email: string }) {
  const router = useRouter()
  const [nomeAtual, setNomeAtual] = useState(nome)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    const resultado = await editarNomePerfil(nomeAtual)
    setSalvando(false)
    if (resultado.erro) {
      setErro(resultado.erro)
      return
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSalvar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nome">Nome</Label>
        <Input
          id="nome"
          type="text"
          value={nomeAtual}
          onChange={(e) => setNomeAtual(e.target.value)}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          readOnly
          className="opacity-50 cursor-not-allowed"
        />
      </div>

      {erro && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {erro}
        </p>
      )}

      <div>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  )
}
