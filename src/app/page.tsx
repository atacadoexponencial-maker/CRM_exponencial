import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  CalendarCheck,
  Contact,
  Kanban,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Store,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

// B22-01 — landing pública do Atacado Exp, exigida pela Meta para a verificação de
// acesso e a análise do app. Página estática: sem login e sem banco.

export const metadata: Metadata = {
  title: "Atacado Exp — CRM para atacadistas que vendem pelo WhatsApp",
  description:
    "Atacado Exp é o CRM para atacadistas que vendem pelo WhatsApp: caixa de entrada do time, funis de Entrada e Recompra, campanhas e automações.",
}

const EMAIL_CONTATO = "atacadoexponencial@gmail.com"

const RECURSOS: { icone: LucideIcon; titulo: string; texto: string }[] = [
  {
    icone: MessageSquare,
    titulo: "Caixa de entrada do WhatsApp",
    texto: "Todas as conversas do número da empresa num só lugar, com texto, imagem, áudio e documento, etiquetas e mensagens rápidas.",
  },
  {
    icone: Kanban,
    titulo: "Funis de Entrada e Recompra",
    texto: "Cada lead no seu estágio, do primeiro contato à recompra.",
  },
  {
    icone: Contact,
    titulo: "Contatos",
    texto: "O histórico de cada cliente, com compras e etiquetas.",
  },
  {
    icone: CalendarCheck,
    titulo: "Sequências e agenda",
    texto: "Lembretes de follow-up para o vendedor não esquecer ninguém.",
  },
  {
    icone: Megaphone,
    titulo: "Campanhas",
    texto: "Modelos de mensagem aprovados enviados para listas segmentadas, com relatório de entrega.",
  },
  {
    icone: Zap,
    titulo: "Automações",
    texto: "Regras que movem o lead, marcam etiquetas e disparam mensagens sozinhas.",
  },
  {
    icone: Store,
    titulo: "Catálogo e loja",
    texto: "Vitrine de produtos com pedido que chega pelo WhatsApp.",
  },
  {
    icone: LayoutDashboard,
    titulo: "Painel",
    texto: "Os números do time e de cada vendedor.",
  },
]

const PASSOS = [
  "A empresa entra no Atacado Exp.",
  "O administrador clica em conectar e entra na janela oficial da Meta, onde escolhe a empresa, a conta do WhatsApp Business e o número.",
  "As mensagens que os compradores mandam para o número passam a chegar na caixa de entrada, e o time responde por ali.",
  "O administrador pode desconectar o número quando quiser.",
]

const botaoEntrar = buttonVariants({ size: "lg", className: "px-5" })

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image src="/atacado-exp-simbolo.png" alt="" width={32} height={32} className="rounded-md" priority />
            <span className="truncate text-base font-semibold tracking-tight">Atacado Exp</span>
          </Link>
          <Link href="/login" data-slot="button" className={botaoEntrar}>
            Entrar
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl sm:leading-tight">
            O CRM para atacadistas que vendem pelo WhatsApp
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Feito para o método de vendas exponencial: um time cuida de quem ainda não comprou (Entrada) e
            outro cuida de quem já é cliente (Recompra), cada um com o seu funil.
          </p>
          <div className="mt-8">
            <Link href="/login" data-slot="button" className={botaoEntrar}>
              Entrar
            </Link>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Para quem é</h2>
            <p className="mt-4 max-w-3xl text-muted-foreground">
              Para atacadistas e marcas que vendem no atacado, atendem os compradores pelo WhatsApp e têm um
              time de vendedores. Cada pessoa entra com o seu papel: administrador, gerente ou atendente.
            </p>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">O que o Atacado Exp faz</h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
                <li key={titulo} className="rounded-xl border border-border bg-card p-5">
                  <Icone className="size-5 text-muted-foreground" aria-hidden />
                  <h3 className="mt-3 font-medium">{titulo}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Como funciona a conexão com o WhatsApp</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PASSOS.map((passo, i) => (
                <li key={passo} className="rounded-xl border border-border bg-card p-5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-sm text-muted-foreground">{passo}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-3xl text-sm text-muted-foreground">
              A conexão usa a API Oficial do WhatsApp Business, da Meta. O envio de modelos de mensagem segue as
              regras da Meta e é cobrado por ela direto na conta da empresa. O número conectado deixa de funcionar
              no aplicativo do WhatsApp do celular.
            </p>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Seus dados</h2>
            <ul className="mt-4 max-w-3xl list-disc space-y-1.5 pl-5 text-muted-foreground">
              <li>Cada empresa só vê os próprios dados.</li>
              <li>Os dados não são vendidos nem usados para publicidade.</li>
              <li>A empresa pode pedir a exclusão dos dados a qualquer momento.</li>
            </ul>
            <p className="mt-4 text-sm">
              <Link href="/politica-de-privacidade" className="underline underline-offset-4 hover:text-foreground/80">
                Leia a Política de Privacidade
              </Link>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-10 text-sm text-muted-foreground sm:px-6">
          <p className="text-foreground">Atacado Exp é um produto da SETE ADS LTDA.</p>
          <p>
            CNPJ 22.987.352/0001-15
            <br />
            Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604
          </p>
          <p>
            Contato:{" "}
            <a href={`mailto:${EMAIL_CONTATO}`} className="break-all underline underline-offset-4 hover:text-foreground">
              {EMAIL_CONTATO}
            </a>
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/politica-de-privacidade" className="underline underline-offset-4 hover:text-foreground">
              Política de Privacidade
            </Link>
            <Link href="/termos-de-servico" className="underline underline-offset-4 hover:text-foreground">
              Termos de Serviço
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} Sete Ads</p>
        </div>
      </footer>
    </div>
  )
}
