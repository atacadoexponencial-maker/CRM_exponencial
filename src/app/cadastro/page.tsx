import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CadastroPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Cadastre sua empresa no CRM Exponencial
          </p>
        </div>

        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-empresa">Nome da empresa</Label>
            <Input id="nome-empresa" type="text" placeholder="Empresa Ltda" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nome-responsavel">Nome do responsável</Label>
            <Input id="nome-responsavel" type="text" placeholder="João Silva" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="joao@empresa.com" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" placeholder="••••••••" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmar-senha">Confirmação de senha</Label>
            <Input id="confirmar-senha" type="password" placeholder="••••••••" />
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
