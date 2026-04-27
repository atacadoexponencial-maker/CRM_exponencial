import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/integrations/supabase/server"
import { FormPerfil } from "./form-perfil"

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single()

  return (
    <div className="max-w-lg flex flex-col gap-10">
      <section>
        <h2 className="text-lg font-semibold mb-4">Dados do perfil</h2>
        <FormPerfil nome={perfil?.name ?? ""} email={user.email ?? ""} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Segurança</h2>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="senha-atual">Senha atual</Label>
            <Input id="senha-atual" type="password" placeholder="••••••••" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input id="nova-senha" type="password" placeholder="••••••••" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmar-nova-senha">Confirmar nova senha</Label>
            <Input id="confirmar-nova-senha" type="password" placeholder="••••••••" />
          </div>

          <div>
            <Button type="submit">Alterar senha</Button>
          </div>
        </form>
      </section>

      <section>
        <Button variant="outline">Sair</Button>
      </section>
    </div>
  )
}
