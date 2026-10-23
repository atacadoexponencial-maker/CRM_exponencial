import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  Check,
  Inbox,
  Kanban,
  Megaphone,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react"

import { TemaClaro } from "@/components/shared/tema-claro"
import { LogoDaMarca } from "@/components/shared/logo-da-marca"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Perguntas } from "./perguntas"
import {
  ABERTURA,
  ANCORAS,
  BOTAO_DEMONSTRACAO,
  BOTAO_ENTRAR,
  CHAMADA_FINAL,
  CONEXAO,
  DOR,
  EMPRESA,
  LINK_DEMONSTRACAO,
  LINK_VER_COMO_FUNCIONA,
  MODULOS,
  PARA_QUEM,
  PERGUNTAS,
  PRINTS,
  SEUS_DADOS,
  VIRADA,
} from "./conteudo"

const ICONES = {
  inbox: Inbox,
  funil: Kanban,
  contatos: Users,
  agenda: CalendarClock,
  campanhas: Megaphone,
  automacoes: Workflow,
  catalogo: BookOpen,
  relatorios: BarChart3,
} as const

/** Rótulo pequeno em caixa alta, na fonte mono, que abre cada seção. */
function Rotulo({ children, claro }: { children: React.ReactNode; claro?: boolean }) {
  return (
    <p className={cn("font-mono text-[11px] font-medium tracking-[0.18em] uppercase", claro ? "text-primary-foreground/60" : "text-muted-foreground")}>
      {children}
    </p>
  )
}

function Titulo({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("mt-3 text-[28px] leading-[1.15] font-semibold tracking-tight text-foreground sm:text-[36px]", className)}>{children}</h2>
}

function BotaoDemonstracao({ className, tamanho = "lg" }: { className?: string; tamanho?: "lg" | "xl" }) {
  return (
    <a
      href={LINK_DEMONSTRACAO}
      target="_blank"
      rel="noopener noreferrer"
      data-botao="demonstracao"
      className={cn(
        buttonVariants({ variant: "default", size: "lg" }),
        "h-10 px-4 text-[15px]",
        tamanho === "xl" && "h-12 px-6 text-base",
        className,
      )}
    >
      {BOTAO_DEMONSTRACAO}
    </a>
  )
}

/** Print do sistema numa "janela" com borda fina e barra de título, como um caderno de amostras. */
function Print({ foto, prioridade, className }: { foto: (typeof PRINTS)[keyof typeof PRINTS]; prioridade?: boolean; className?: string }) {
  return (
    <figure className={cn("overflow-hidden rounded-lg border border-border bg-card shadow-[0_1px_0_var(--border),0_18px_40px_-24px_rgba(28,27,24,0.45)]", className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-muted px-3 py-2" aria-hidden>
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
      </div>
      <Image src={foto.src} alt={foto.alt} width={foto.largura} height={foto.altura} priority={prioridade} sizes="(min-width: 1024px) 640px, 100vw" className="block h-auto w-full" />
    </figure>
  )
}

function Numero({ n, claro }: { n: number; claro?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-[13px] font-medium",
        claro ? "border-primary-foreground/30 text-primary-foreground" : "border-border bg-card text-foreground",
      )}
    >
      {String(n).padStart(2, "0")}
    </span>
  )
}

export function Landing() {
  const ano = new Date().getFullYear()

  return (
    <TemaClaro>
      <div className="min-h-screen bg-background text-foreground">
        {/* Cabeçalho */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <a href="#topo" aria-label="crmatacado exp, início" className="flex items-center">
              <LogoDaMarca className="h-8" />
            </a>
            <nav aria-label="Seções" className="hidden items-center gap-7 md:flex">
              {ANCORAS.map((a) => (
                <a key={a.id} href={`#${a.id}`} data-ancora={a.id} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {a.rotulo}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href="/login" data-botao="entrar" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-10 px-3 text-[15px]")}>
                {BOTAO_ENTRAR}
              </Link>
              <BotaoDemonstracao />
            </div>
          </div>
        </header>

        <main id="topo">
          {/* Abertura */}
          <section aria-labelledby="titulo-abertura" className="border-b border-border">
            <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-24">
              <div>
                <Rotulo>{ABERTURA.rotulo}</Rotulo>
                <h1 id="titulo-abertura" className="mt-4 text-[36px] leading-[1.08] font-semibold tracking-tight text-foreground sm:text-[48px] lg:text-[54px]">
                  {ABERTURA.titulo}
                </h1>
                <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-muted-foreground">{ABERTURA.subtitulo}</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <BotaoDemonstracao tamanho="xl" />
                  <a href="#como-funciona" data-ancora="ver-como-funciona" className="inline-flex h-12 items-center gap-1.5 px-2 text-base font-medium text-foreground underline-offset-4 hover:underline">
                    {LINK_VER_COMO_FUNCIONA}
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
                <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                  {ABERTURA.selos.map((selo) => (
                    <li key={selo} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="size-4 text-sucesso" aria-hidden />
                      {selo}
                    </li>
                  ))}
                </ul>
              </div>
              <Print foto={PRINTS.caixaDeEntrada} prioridade />
            </div>
          </section>

          {/* A dor */}
          <section aria-labelledby="titulo-dor" className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <Rotulo>{DOR.rotulo}</Rotulo>
              <Titulo>
                <span id="titulo-dor">{DOR.titulo}</span>
              </Titulo>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {DOR.itens.map((item) => (
                  <li key={item.titulo} className="rounded-lg border border-border bg-card p-5">
                    <h3 className="text-[15px] font-semibold text-foreground">{item.titulo}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.texto}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* A virada */}
          <section aria-labelledby="titulo-virada" className="border-b border-border bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <Rotulo>{VIRADA.rotulo}</Rotulo>
              <Titulo>
                <span id="titulo-virada">{VIRADA.titulo}</span>
              </Titulo>
              <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {VIRADA.passos.map((passo, i) => (
                  <li key={passo.titulo} className="flex gap-4 lg:flex-col">
                    <Numero n={i + 1} />
                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground">{passo.titulo}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{passo.texto}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Módulos */}
          <section id="modulos" aria-labelledby="titulo-modulos" className="scroll-mt-16 border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <Rotulo>{MODULOS.rotulo}</Rotulo>
              <Titulo>
                <span id="titulo-modulos">{MODULOS.titulo}</span>
              </Titulo>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-lista="modulos">
                {MODULOS.itens.map((m) => {
                  const Icone = ICONES[m.icone]
                  return (
                    <li key={m.titulo} className="rounded-lg border border-border bg-card p-5" data-modulo>
                      <Icone className="size-5 text-foreground" aria-hidden />
                      <h3 className="mt-4 text-[15px] font-semibold text-foreground">{m.titulo}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.texto}</p>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-12 grid gap-6 lg:grid-cols-2">
                <Print foto={PRINTS.funil} />
                <Print foto={PRINTS.catalogo} />
              </div>
            </div>
          </section>

          {/* Para quem */}
          <section id="para-quem" aria-labelledby="titulo-para-quem" className="scroll-mt-16 border-b border-border bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <Rotulo>{PARA_QUEM.rotulo}</Rotulo>
              <Titulo>
                <span id="titulo-para-quem">{PARA_QUEM.titulo}</span>
              </Titulo>
              <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {PARA_QUEM.perfis.map((p) => (
                  <li key={p.titulo} className="flex gap-3 border-t border-border pt-5">
                    <Check className="mt-0.5 size-4 shrink-0 text-sucesso" aria-hidden />
                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground">{p.titulo}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Como funciona a conexão */}
          <section id="como-funciona" aria-labelledby="titulo-como-funciona" className="scroll-mt-16 border-b border-border">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-20">
              <div>
                <Rotulo>{CONEXAO.rotulo}</Rotulo>
                <Titulo>
                  <span id="titulo-como-funciona">{CONEXAO.titulo}</span>
                </Titulo>
                <ol className="mt-8 space-y-5" data-lista="conexao">
                  {CONEXAO.passos.map((passo, i) => (
                    <li key={passo.titulo} className="flex gap-4" data-passo-conexao>
                      <Numero n={i + 1} />
                      <div>
                        <h3 className="text-[15px] font-semibold text-foreground">{passo.titulo}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{passo.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-8 flex gap-3 rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                  <span>{CONEXAO.nota}</span>
                </p>
              </div>
              <Print foto={PRINTS.conexao} />
            </div>
          </section>

          {/* Seus dados */}
          <section aria-labelledby="titulo-seus-dados" className="border-b border-border bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                <div>
                  <Rotulo>{SEUS_DADOS.rotulo}</Rotulo>
                  <Titulo>
                    <span id="titulo-seus-dados">{SEUS_DADOS.titulo}</span>
                  </Titulo>
                </div>
                <div>
                  <ul className="space-y-3">
                    {SEUS_DADOS.itens.map((t) => (
                      <li key={t} className="flex gap-3 text-[15px] text-foreground">
                        <Check className="mt-1 size-4 shrink-0 text-sucesso" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Link href="/politica-de-privacidade" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-foreground underline-offset-4 hover:underline">
                    Ler a Política de Privacidade
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Perguntas frequentes */}
          <section id="perguntas" aria-labelledby="titulo-perguntas" className="scroll-mt-16 border-b border-border">
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
              <Rotulo>{PERGUNTAS.rotulo}</Rotulo>
              <Titulo>
                <span id="titulo-perguntas">{PERGUNTAS.titulo}</span>
              </Titulo>
              <div className="mt-8">
                <Perguntas itens={PERGUNTAS.itens} />
              </div>
            </div>
          </section>

          {/* Chamada final */}
          <section aria-labelledby="titulo-chamada" className="bg-primary text-primary-foreground">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
              <div>
                <h2 id="titulo-chamada" className="text-[28px] leading-[1.15] font-semibold tracking-tight sm:text-[36px]">
                  {CHAMADA_FINAL.titulo}
                </h2>
                <p className="mt-3 text-[15px] text-primary-foreground/70">{CHAMADA_FINAL.texto}</p>
              </div>
              <a
                href={LINK_DEMONSTRACAO}
                target="_blank"
                rel="noopener noreferrer"
                data-botao="demonstracao"
                className={cn(buttonVariants({ variant: "default", size: "lg" }), "h-12 bg-primary-foreground px-6 text-base text-primary hover:bg-primary-foreground/90")}
              >
                {BOTAO_DEMONSTRACAO}
              </a>
            </div>
          </section>
        </main>

        {/* Rodapé */}
        <footer className="border-t border-border bg-background">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <LogoDaMarca className="h-7" priority={false} />
              <p className="mt-4 text-sm text-foreground">
                {EMPRESA.produto} é um produto da <strong>{EMPRESA.razaoSocial}</strong>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">CNPJ {EMPRESA.cnpj}</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{EMPRESA.endereco}</p>
              <a href={`mailto:${EMPRESA.email}`} className="mt-3 inline-block text-sm text-foreground underline-offset-4 hover:underline">
                {EMPRESA.email}
              </a>
            </div>
            <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm md:items-end">
              <Link href="/politica-de-privacidade" className="text-muted-foreground hover:text-foreground">
                Política de Privacidade
              </Link>
              <Link href="/termos-de-servico" className="text-muted-foreground hover:text-foreground">
                Termos de Serviço
              </Link>
              <Link href="/login" data-botao="entrar" className="text-muted-foreground hover:text-foreground">
                {BOTAO_ENTRAR}
              </Link>
            </nav>
          </div>
          <div className="border-t border-border">
            <p className="mx-auto max-w-6xl px-4 py-4 font-mono text-[11px] tracking-wide text-muted-foreground uppercase sm:px-6">
              © {ano} {EMPRESA.razaoSocial}
            </p>
          </div>
        </footer>
      </div>
    </TemaClaro>
  )
}
