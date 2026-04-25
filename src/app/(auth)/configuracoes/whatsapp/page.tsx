import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// Alterne para false para visualizar o estado vazio
const MOCK_CONECTADO = true

const mockNumero = {
  numero: "+55 11 99999-9999",
  nomeExibicao: "Atendimento Empresa",
  status: "Conectado" as const,
}

export default function WhatsAppPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">WhatsApp</h1>
        <Button disabled={MOCK_CONECTADO}>Conectar número</Button>
      </div>

      {MOCK_CONECTADO ? (
        <div className="rounded-lg border p-6 max-w-md">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Número conectado</p>
              <p className="text-lg font-semibold">{mockNumero.numero}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{mockNumero.nomeExibicao}</p>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
              Conectado
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">Desconectar</Button>
            <Button variant="outline" disabled>Reconectar</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-12 max-w-md flex flex-col items-center gap-4 text-center">
          <p className="text-muted-foreground">Nenhum número conectado</p>
          <Button>Conectar número</Button>
        </div>
      )}
    </div>
  )
}
