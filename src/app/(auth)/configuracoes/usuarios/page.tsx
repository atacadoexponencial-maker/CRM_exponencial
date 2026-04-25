import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

const usuarios = [
  {
    id: 1,
    nome: "Ana Costa",
    email: "ana@empresa.com",
    papel: "Admin" as const,
    times: ["Expansão", "Retenção"],
    status: "Ativo" as const,
  },
  {
    id: 2,
    nome: "Carlos Lima",
    email: "carlos@empresa.com",
    papel: "Gerente" as const,
    times: ["Expansão"],
    status: "Ativo" as const,
  },
  {
    id: 3,
    nome: "Beatriz Souza",
    email: "beatriz@empresa.com",
    papel: "Atendente" as const,
    times: ["Retenção"],
    status: "Inativo" as const,
  },
]

const papelVariant: Record<string, "default" | "outline" | "secondary"> = {
  Admin: "default",
  Gerente: "outline",
  Atendente: "secondary",
}

export default function UsuariosPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Usuários</h1>
        <Button>Adicionar usuário</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Papel</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Times</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr key={usuario.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{usuario.nome}</td>
                <td className="px-4 py-3 text-muted-foreground">{usuario.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={papelVariant[usuario.papel]}>{usuario.papel}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {usuario.times.join(", ")}
                </td>
                <td className="px-4 py-3">
                  {usuario.status === "Ativo" ? (
                    <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Inativo</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex h-6 w-6 items-center justify-center rounded-md hover:bg-accent transition-colors">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Editar papel</DropdownMenuItem>
                      <DropdownMenuItem>Gerenciar times</DropdownMenuItem>
                      {usuario.status === "Ativo" ? (
                        <DropdownMenuItem variant="destructive">Desativar</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>Reativar</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
