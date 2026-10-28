"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { avisar } from "@/lib/aviso-na-tela"
import { FUSOS_DO_BRASIL } from "@/lib/datas"
import { salvarFuso } from "./actions"

const selectClass =
  "h-8 w-full max-w-xs rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"

export function EmpresaClient({ fusoInicial }: { fusoInicial: string }) {
  const router = useRouter()
  const [fuso, setFuso] = useState(fusoInicial)
  const [salvo, setSalvo] = useState(fusoInicial)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    setSalvando(true)
    setErro(null)
    const res = await salvarFuso(fuso)
    setSalvando(false)
    if (res.erro) {
      setErro(res.erro)
      return
    }
    setSalvo(fuso)
    avisar("Fuso salvo")
    // O fuso chega às telas pelo layout: recarrega para todas passarem a usá-lo
    router.refresh()
  }

  return (
    <>
      <h1 className="text-[26px] font-semibold leading-tight tracking-tight mb-6">Empresa</h1>

      <section className="space-y-2 max-w-xl">
        <Label htmlFor="fuso">Fuso horário</Label>
        <select id="fuso" className={selectClass} value={fuso} onChange={(e) => setFuso(e.target.value)}>
          {FUSOS_DO_BRASIL.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">
          Vale para todos da empresa: as horas das telas, a Agenda e o horário comercial das automações.
          Os filtros por data e a janela de envio das campanhas continuam no horário de Brasília.
        </p>
        {erro && (
          <p role="alert" className="text-sm text-erro">
            {erro}
          </p>
        )}
        <Button size="sm" onClick={salvar} disabled={salvando || fuso === salvo}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </section>
    </>
  )
}
