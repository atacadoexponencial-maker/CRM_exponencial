import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { sessaoAtual } from "@/lib/sessao"
import { FormPerfil } from "./form-perfil"
import { FormAlterarSenha } from "./form-alterar-senha"
import { realizarLogout } from "./actions"

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  const { motivo } = await searchParams

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <div className="max-w-lg flex flex-col gap-10">
        {/* QA M30 (06/10): quem abre uma tela que o papel não permite cai aqui e sabe por quê. */}
        {motivo === "sem-permissao" && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-500" role="status">
            Essa tela não está disponível para o seu papel. Fale com o administrador da sua empresa se precisar dela.
          </p>
        )}
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
