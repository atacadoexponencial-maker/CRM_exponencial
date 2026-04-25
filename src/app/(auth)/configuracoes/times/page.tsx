import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

const times = [
  {
    id: 1,
    nome: "Expansão",
    tipo: "Padrão" as const,
    membros: [
      { id: 1, nome: "Ana Costa" },
      { id: 2, nome: "Carlos Lima" },
    ],
  },
  {
    id: 2,
    nome: "Retenção",
    tipo: "Padrão" as const,
    membros: [
      { id: 3, nome: "Beatriz Souza" },
    ],
  },
  {
    id: 3,
    nome: "Prospecção",
    tipo: "Personalizado" as const,
    membros: [
      { id: 2, nome: "Carlos Lima" },
      { id: 3, nome: "Beatriz Souza" },
    ],
  },
]

function Iniciais({ nome }: { nome: string }) {
  const partes = nome.trim().split(" ")
  const iniciais = partes.length >= 2
    ? partes[0][0] + partes[partes.length - 1][0]
    : partes[0][0]
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
      {iniciais.toUpperCase()}
    </span>
  )
}

export default function TimesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Times</h1>
        <Button>Criar time</Button>
      </div>

      <div className="flex flex-col gap-4">
        {times.map((time) => (
          <div key={time.id} className="rounded-lg border">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <span className="font-medium">{time.nome}</span>
                <Badge
                  className={
                    time.tipo === "Padrão"
                      ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                      : "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
                  }
                >
                  {time.tipo}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {time.membros.length} {time.membros.length === 1 ? "membro" : "membros"}
                </span>
              </div>

              {time.tipo === "Personalizado" && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Abrir menu</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Editar nome</DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="px-4 py-3 flex flex-wrap gap-3">
              {time.membros.map((membro) => (
                <div key={membro.id} className="flex items-center gap-2 text-sm">
                  <Iniciais nome={membro.nome} />
                  <span>{membro.nome}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
