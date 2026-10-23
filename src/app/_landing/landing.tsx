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
  ShoppingBag,
  BellRing,
  Users,
  Workflow,
} from "lucide-react"

import { TemaClaro } from "@/components/shared/tema-claro"
import { LogoDaMarca } from "@/components/shared/logo-da-marca"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Perguntas } from "./perguntas"
import { Revelar } from "./revelar"
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
    <p className={cn("font-mono text-[14px] font-medium tracking-[0.16em] uppercase", claro ? "text-primary-foreground/75" : "text-foreground/70")}>
      {children}
    </p>
  )
}

function Titulo({ children, className, claro }: { children: React.ReactNode; className?: string; claro?: boolean }) {
  return (
    <h2 className={cn("mt-4 text-[30px] leading-[1.12] font-semibold tracking-tight sm:text-[40px]", claro ? "text-primary-foreground" : "text-foreground", className)}>
      {children}
    </h2>
  )
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

/** Cartão que flutua sobre o print da abertura: um acontecimento do dia a dia do CRM. */
function Flutuante({ className, atraso, icone, titulo, texto }: { className?: string; atraso: string; icone: React.ReactNode; titulo: string; texto: string }) {
  return (
    <div
      aria-hidden
      style={{ animationDelay: atraso }}
      className={cn(
        "absolute items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5 shadow-[0_12px_30px_-16px_rgba(28,27,24,0.5)] motion-safe:animate-[flutuar_5s_ease-in-out_infinite]",
        className,
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-md bg-muted text-foreground">{icone}</span>
      <span className="leading-tight">
        <span className="block text-[13px] font-semibold text-foreground">{titulo}</span>
        <span className="block text-[12px] text-muted-foreground">{texto}</span>
      </span>
    </div>
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
      <style>{`@keyframes flutuar { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }`}</style>
      <div className="min-h-screen bg-background text-foreground">
        {/* Cabeçalho */}
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <a href="#topo" aria-label="crmatacado exp, início" className="flex items-center">
              <LogoDaMarca className="h-11" />
            </a>
            <nav aria-label="Seções" className="hidden items-center gap-7 md:flex">
              {ANCORAS.map((a) => (
                <a key={a.id} href={`#${a.id}`} data-ancora={a.id} className="text-[15px] font-medium text-foreground/80 transition-colors hover:text-foreground">
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
                <h1 id="titulo-abertura" className="mt-5 text-[36px] leading-[1.08] font-semibold tracking-tight text-foreground sm:text-[48px] lg:text-[54px]">
                  {ABERTURA.titulo}
                </h1>
                <p className="mt-5 max-w-xl text-[19px] leading-relaxed text-muted-foreground sm:text-[21px]">{ABERTURA.subtitulo}</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <BotaoDemonstracao tamanho="xl" />
                  <a href="#como-funciona" data-ancora="ver-como-funciona" className="inline-flex h-12 items-center gap-1.5 px-2 text-base font-medium text-foreground underline-offset-4 hover:underline">
                    {LINK_VER_COMO_FUNCIONA}
                    <ArrowRight className="size-4" aria-hidden />
                  </a>
                </div>
                <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
                  {ABERTURA.selos.map((selo) => (
                    <li key={selo} className="flex items-center gap-2 text-[15px] text-foreground/80">
                      <Check className="size-4 text-sucesso" aria-hidden />
                      {selo}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <Print foto={PRINTS.caixaDeEntrada} prioridade />
                <Flutuante className="-left-4 top-8 hidden sm:flex lg:-left-10" atraso="0s" icone={<Inbox className="size-4" aria-hidden />} titulo="Nova conversa" texto="Pode mandar o catálogo?" />
                <Flutuante className="-right-3 top-1/3 hidden sm:flex lg:-right-8" atraso="1.3s" icone={<ShoppingBag className="size-4 text-sucesso" aria-hidden />} titulo="Pedido recebido" texto="48 peças · R$ 1.250" />
                <Flutuante className="-left-2 bottom-6 hidden sm:flex lg:-left-8" atraso="2.6s" icone={<BellRing className="size-4 text-aviso" aria-hidden />} titulo="Follow-up hoje" texto="Loja da Ana · 14h" />
              </div>
            </div>
          </section>

          {/* A dor */}
          <section aria-labelledby="titulo-dor" className="border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <Revelar>
                <Rotulo>{DOR.rotulo}</Rotulo>
                <Titulo>
                  <span id="titulo-dor">{DOR.titulo}</span>
                </Titulo>
              </Revelar>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {DOR.itens.map((item, i) => (
                  <Revelar key={item.titulo} atraso={i * 100}>
                    <li className="h-full rounded-lg border border-border bg-card p-6">
                      <h3 className="text-[17px] font-semibold text-foreground">{item.titulo}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.texto}</p>
                    </li>
                  </Revelar>
                ))}
              </ul>
            </div>
          </section>

          {/* A virada */}
          <section aria-labelledby="titulo-virada" className="bg-primary text-primary-foreground">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
              <Revelar>
                <Rotulo claro>{VIRADA.rotulo}</Rotulo>
                <Titulo claro>
                  <span id="titulo-virada">{VIRADA.titulo}</span>
                </Titulo>
              </Revelar>
              <ol className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
                {VIRADA.passos.map((passo, i) => (
                  <Revelar key={passo.titulo} atraso={i * 120}>
                    <li className="flex gap-4 border-t border-primary-foreground/20 pt-6 lg:flex-col">
                      <Numero n={i + 1} claro />
                      <div>
                        <h3 className="text-[17px] font-semibold text-primary-foreground">{passo.titulo}</h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-primary-foreground/70">{passo.texto}</p>
                      </div>
                    </li>
                  </Revelar>
                ))}
              </ol>
            </div>
          </section>

          {/* Módulos */}
          <section id="modulos" aria-labelledby="titulo-modulos" className="scroll-mt-16 border-b border-border">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <Revelar>
                <Rotulo>{MODULOS.rotulo}</Rotulo>
                <Titulo>
                  <span id="titulo-modulos">{MODULOS.titulo}</span>
                </Titulo>
              </Revelar>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-lista="modulos">
                {MODULOS.itens.map((m, i) => {
                  const Icone = ICONES[m.icone]
                  return (
                    <Revelar key={m.titulo} atraso={(i % 4) * 100}>
                      <li className="group/modulo h-full rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/40" data-modulo>
                        <span className="flex size-10 items-center justify-center rounded-md bg-muted text-foreground transition-all duration-300 group-hover/modulo:-translate-y-0.5 group-hover/modulo:bg-primary group-hover/modulo:text-primary-foreground">
                          <Icone className="size-5" aria-hidden />
                        </span>
                        <h3 className="mt-4 text-[17px] font-semibold text-foreground">{m.titulo}</h3>
                        <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{m.texto}</p>
                      </li>
                    </Revelar>
                  )
                })}
              </ul>
              <div className="mt-12 grid gap-6 lg:grid-cols-2">
                <Revelar><Print foto={PRINTS.funil} /></Revelar>
                <Revelar atraso={150}><Print foto={PRINTS.catalogo} /></Revelar>
              </div>
            </div>
          </section>

          {/* Para quem */}
          <section id="para-quem" aria-labelledby="titulo-para-quem" className="scroll-mt-16 border-b border-border bg-muted/40">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
              <Revelar>
                <Rotulo>{PARA_QUEM.rotulo}</Rotulo>
                <Titulo>
                  <span id="titulo-para-quem">{PARA_QUEM.titulo}</span>
                </Titulo>
              </Revelar>
              <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {PARA_QUEM.perfis.map((p) => (
                  <li key={p.titulo} className="flex gap-3 border-t border-border pt-6">
                    <Check className="mt-0.5 size-4 shrink-0 text-sucesso" aria-hidden />
                    <div>
                      <h3 className="text-[17px] font-semibold text-foreground">{p.titulo}</h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{p.texto}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Como funciona a conexão */}
          <section id="como-funciona" aria-labelledby="titulo-como-funciona" className="scroll-mt-16 border-b border-border">
            <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-20">
              <Revelar>
                <Rotulo>{CONEXAO.rotulo}</Rotulo>
                <Titulo>
                  <span id="titulo-como-funciona">{CONEXAO.titulo}</span>
                </Titulo>
                <ol className="mt-8 space-y-5" data-lista="conexao">
                  {CONEXAO.passos.map((passo, i) => (
                    <li key={passo.titulo} className="flex gap-4" data-passo-conexao>
                      <Numero n={i + 1} />
                      <div>
                        <h3 className="text-[17px] font-semibold text-foreground">{passo.titulo}</h3>
                        <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{passo.texto}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-8 flex gap-3 rounded-lg border border-border bg-card p-4 text-[15px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                  <span>{CONEXAO.nota}</span>
                </p>
              </Revelar>
              <Revelar atraso={150}><Print foto={PRINTS.conexao} /></Revelar>
            </div>
          </section>

          {/* Seus dados */}
          <section aria-labelledby="titulo-seus-dados" className="bg-primary text-primary-foreground">
            <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
              <Revelar className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                <div>
                  <Rotulo claro>{SEUS_DADOS.rotulo}</Rotulo>
                  <Titulo claro>
                    <span id="titulo-seus-dados">{SEUS_DADOS.titulo}</span>
                  </Titulo>
                </div>
                <div>
                  <ul className="space-y-4">
                    {SEUS_DADOS.itens.map((t) => (
                      <li key={t} className="flex gap-3 text-[17px] text-primary-foreground">
                        <Check className="mt-1.5 size-4 shrink-0 text-sucesso-fundo" aria-hidden />
                        {t}
                      </li>
                    ))}
                  </ul>
                  <Link href="/politica-de-privacidade" className="mt-8 inline-flex items-center gap-1.5 text-[15px] font-medium text-primary-foreground underline-offset-4 hover:underline">
                    Ler a Política de Privacidade
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </Revelar>
            </div>
          </section>

          {/* Perguntas frequentes */}
          <section id="perguntas" aria-labelledby="titulo-perguntas" className="scroll-mt-16 border-b border-border">
            <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-20">
              <Revelar>
                <Rotulo>{PERGUNTAS.rotulo}</Rotulo>
                <Titulo>
                  <span id="titulo-perguntas">{PERGUNTAS.titulo}</span>
                </Titulo>
                <div className="mt-8">
                  <Perguntas itens={PERGUNTAS.itens} />
                </div>
              </Revelar>
            </div>
          </section>

          {/* Chamada final */}
          <section aria-labelledby="titulo-chamada" className="bg-primary text-primary-foreground">
            <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:py-20">
              <div>
                <h2 id="titulo-chamada" className="text-[28px] leading-[1.15] font-semibold tracking-tight sm:text-[36px]">
                  {CHAMADA_FINAL.titulo}
                </h2>
                <p className="mt-3 text-[17px] text-primary-foreground/70">{CHAMADA_FINAL.texto}</p>
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
              <LogoDaMarca className="h-9" priority={false} />
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
