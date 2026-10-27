import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { sessaoAtual } from "@/lib/sessao"
import { FormPerfil } from "./form-perfil"
import { FormAlterarSenha } from "./form-alterar-senha"
import { realizarLogout } from "./actions"
import { CLASSE_DA_PAGINA } from "@/lib/pagina"

export const metadata = { title: "Meu perfil" }

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ motivo?: string }> }) {
  const { user, perfil } = await sessaoAtual()
  if (!user) redirect("/login")
  const { motivo } = await searchParams

  return (
    <div className={CLASSE_DA_PAGINA}>
      <div className="max-w-lg flex flex-col gap-10">
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight -mb-2">Meu perfil</h1>
        {/* QA M30 (06/10): quem abre uma tela que o papel não permite cai aqui e sabe por quê. */}
        {motivo === "sem-permissao" && (
          <p className="rounded-lg border border-aviso/40 bg-aviso-fundo px-4 py-3 text-sm text-aviso" role="status">
            Essa tela não está disponível para o seu papel. Fale com o administrador da sua empresa se precisar dela.
          </p>
        )}
        <section>
          <h2 className="text-[15px] font-semibold mb-4 border-t pt-5">Dados do perfil</h2>
          <FormPerfil nome={perfil?.name ?? ""} email={user.email ?? ""} />
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-4 border-t pt-5">Segurança</h2>
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
