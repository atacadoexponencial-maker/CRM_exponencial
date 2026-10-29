import { TemaClaro } from "@/components/shared/tema-claro"
import { LogoDaMarca } from "@/components/shared/logo-da-marca"
import { AVISO_CONVITE_INVALIDO, conviteParaCadastro } from "@/lib/convites"
import { FormularioCadastro } from "./formulario-cadastro"
import { schema } from "./schema"

export { schema }

// B51-02: conta nova só com convite. Sem ele, ou com um que não vale mais, a página
// mostra o aviso no lugar do formulário. A action confere de novo ao enviar.
export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ convite?: string | string[] }> }) {
  const { convite } = await searchParams
  const codigo = typeof convite === "string" ? convite : null
  const valido = codigo ? await conviteParaCadastro(codigo) : null

  let titulo = "Criar conta"
  let texto = "Cadastre sua empresa no crmatacado exp"
  if (!codigo) {
    titulo = "Cadastro por convite"
    texto = "O cadastro de empresas no crmatacado exp é feito por convite. Se você recebeu um link, abra-o para criar sua conta."
  } else if (!valido) {
    titulo = "Convite inválido"
    texto = AVISO_CONVITE_INVALIDO
  }

  return (
    <TemaClaro>
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <LogoDaMarca className="mx-auto mb-6 h-16" />
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          <p className="text-sm text-muted-foreground mt-2">{texto}</p>
        </div>

        {codigo && valido && (
          <FormularioCadastro convite={codigo} emailDoConvite={valido.email} avisoConviteInvalido={AVISO_CONVITE_INVALIDO} />
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <a href="/login" className="text-foreground font-medium underline underline-offset-4 hover:text-foreground/80">
            Entrar
          </a>
        </p>
      </div>
    </div>
    </TemaClaro>
  )
}
