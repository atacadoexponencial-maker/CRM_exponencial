import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { sessaoAtual } from "@/lib/sessao"
import { FormPerfil } from "./form-perfil"
import { FormAlterarSenha } from "./form-alterar-senha"
import { realizarLogout } from "./actions"

export default async function PerfilPage() {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <div className="max-w-lg flex flex-col gap-10">
        <section>
          <h2 className="text-lg font-semibold mb-4">Dados do perfil</h2>
          <FormPerfil nome={perfil?.name ?? ""} email={user.email ?? ""} />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Segurança</h2>
          <FormAlterarSenha />
        </section>

        <section>
          <form action={realizarLogout}>
            <Button type="submit" variant="outline">Sair</Button>
          </form>
        </section>
      </div>
    </div>
  )
}
