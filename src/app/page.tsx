import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"

// B22-01 — landing pública do Atacado Exp, exigida pela Meta para a verificação de
// acesso e a análise do app. Página estática: sem login e sem banco. A identidade
// segue a do atacadoexponencial.com: Satoshi, creme alternando com faixas escuras,
// rótulos em caixa alta e botões em pílula.

export const metadata: Metadata = {
  title: "Atacado Exp — CRM para atacadistas que vendem pelo WhatsApp",
  description:
    "Atacado Exp é o CRM para atacadistas que vendem pelo WhatsApp: caixa de entrada do time, funis de Entrada e Recompra, campanhas e automações.",
}

const EMAIL_CONTATO = "atacadoexponencial@gmail.com"

const DESTAQUES = [
  { valor: "2 funis", legenda: "Entrada e Recompra" },
  { valor: "3 papéis", legenda: "Administrador, gerente e atendente" },
  { valor: "8 recursos", legenda: "Do chat ao painel do time" },
  { valor: "API Oficial", legenda: "Do WhatsApp Business" },
]

const PERFIL = [
  "Você vende no atacado para lojistas, sacoleiras ou revendedores",
  "Seus compradores fazem pedido e tiram dúvida pelo WhatsApp",
  "Você tem um time de vendedores atendendo no mesmo número",
  "Você quer separar quem busca cliente novo de quem cuida de quem já comprou",
]

const PAPEIS = [
  { titulo: "Administrador", texto: "Conecta o número, configura o time e vê tudo." },
  { titulo: "Gerente", texto: "Acompanha os funis, as campanhas e o resultado de cada vendedor." },
  { titulo: "Atendente", texto: "Atende as próprias conversas e cuida dos próprios clientes." },
]

const RECURSOS = [
  {
    titulo: "Caixa de entrada do WhatsApp",
    texto: "Todas as conversas do número da empresa num só lugar, com texto, imagem, áudio e documento, etiquetas e mensagens rápidas.",
  },
  { titulo: "Funis de Entrada e Recompra", texto: "Cada lead no seu estágio, do primeiro contato à recompra." },
  { titulo: "Contatos", texto: "O histórico de cada cliente, com compras e etiquetas." },
  { titulo: "Sequências e agenda", texto: "Lembretes de follow-up para o vendedor não esquecer ninguém." },
  {
    titulo: "Campanhas",
    texto: "Modelos de mensagem aprovados enviados para listas segmentadas, com relatório de entrega.",
  },
  { titulo: "Automações", texto: "Regras que movem o lead, marcam etiquetas e disparam mensagens sozinhas." },
  { titulo: "Catálogo e loja", texto: "Vitrine de produtos com pedido que chega pelo WhatsApp." },
  { titulo: "Painel", texto: "Os números do time e de cada vendedor." },
]

const PASSOS = [
  { titulo: "Entre no Atacado Exp", texto: "A empresa entra no Atacado Exp." },
  {
    titulo: "Conecte pela Meta",
    texto: "O administrador clica em conectar e entra na janela oficial da Meta, onde escolhe a empresa, a conta do WhatsApp Business e o número.",
  },
  {
    titulo: "Atenda pelo time",
    texto: "As mensagens que os compradores mandam para o número passam a chegar na caixa de entrada, e o time responde por ali.",
  },
  { titulo: "Desconecte quando quiser", texto: "O administrador pode desconectar o número quando quiser." },
]

const DADOS = [
  "Cada empresa só vê os próprios dados.",
  "Os dados não são vendidos nem usados para publicidade.",
  "A empresa pode pedir a exclusão dos dados a qualquer momento.",
]

const rotulo = "text-[11px] font-bold uppercase tracking-[0.15em] text-[#A6A6A6]"
const tituloSecao = "mt-4 text-3xl font-bold leading-[1.1] tracking-tight sm:text-[44px]"

function Logo({ escuro }: { escuro?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      {/* O cubo é branco; no fundo claro ele é invertido para ficar escuro. */}
      <Image
        src="/atacado-exp-simbolo.png"
        alt=""
        width={51}
        height={32}
        className={escuro ? "h-7 w-auto" : "h-7 w-auto invert"}
        priority
      />
      <span className="flex flex-col leading-none">
        <span className="text-[19px] font-bold tracking-tight">atacado</span>
        <span className="text-[19px] italic tracking-tight">exp</span>
      </span>
    </span>
  )
}

function BotaoEntrar({ children, claro }: { children: React.ReactNode; claro?: boolean }) {
  return (
    <Link
      href="/login"
      className={
        claro
          ? "inline-flex items-center gap-4 rounded-full bg-white py-3 pl-7 pr-3 text-[13px] font-bold uppercase tracking-[0.12em] text-[#1E1E1E] transition-opacity hover:opacity-90"
          : "inline-flex items-center gap-4 rounded-full bg-[#1E1E1E] py-3 pl-7 pr-3 text-[13px] font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90"
      }
    >
      {children}
      <span
        className={
          claro
            ? "flex size-9 items-center justify-center rounded-full bg-[#1E1E1E]/10"
            : "flex size-9 items-center justify-center rounded-full bg-white/15"
        }
      >
        <ArrowRight className="size-4" aria-hidden />
      </span>
    </Link>
  )
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F1EB] text-[#1F1F1F]" style={{ fontFamily: "Satoshi, sans-serif" }}>
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <Link href="/" aria-label="Atacado Exp, início">
            <Logo />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#1E1E1E]/10 bg-[#1E1E1E]/5 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:bg-[#1E1E1E]/10"
          >
            Entrar
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-14 text-center sm:px-6 sm:pt-24">
          <p className="mx-auto inline-block rounded-full border border-[#1E1E1E]/15 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-[#1E1E1E]/70 sm:text-[11px]">
            Para marcas de atacado que vendem pelo WhatsApp
          </p>
          <h1 className="mx-auto mt-8 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            O CRM feito para o{" "}
            <span className="bg-[linear-gradient(transparent_14%,#FFE94D_14%,#FFE94D_92%,transparent_92%)] px-1.5">
              atacado
            </span>{" "}
            que vende pelo WhatsApp
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#1E1E1E]/75 sm:text-lg">
            Feito para o método de vendas exponencial: um time cuida de quem ainda não comprou (Entrada) e
            outro cuida de quem já é cliente (Recompra), cada um com o seu funil.
          </p>
          <div className="mt-10">
            <BotaoEntrar>Entrar no Atacado Exp</BotaoEntrar>
          </div>

          <ul className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-3 text-left lg:grid-cols-4">
            {DESTAQUES.map((d) => (
              <li key={d.valor} className="rounded-2xl border border-[#1E1E1E]/10 bg-white/40 p-5">
                <p className="text-2xl font-bold tracking-tight">{d.valor}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#1E1E1E]/60">{d.legenda}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-[#1F1F1F] text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <p className={rotulo}>Para quem é</p>
              <h2 className={tituloSecao}>Feito para marca de atacado. Só isso mesmo.</h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/60">
                Atacadistas e marcas que vendem no atacado, atendem os compradores pelo WhatsApp e têm um time de
                vendedores.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 border-t-2 border-t-[#4ADE80] p-7">
                <h3 className="text-sm font-bold uppercase tracking-[0.1em]">Faz sentido para você se:</h3>
                <ul className="mt-6 space-y-4">
                  {PERFIL.map((item) => (
                    <li key={item} className="flex gap-3 text-[15px] text-white/85">
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4ADE80]/15">
                        <Check className="size-3.5 text-[#4ADE80]" aria-hidden />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 border-t-2 border-t-white p-7">
                <h3 className="text-sm font-bold uppercase tracking-[0.1em]">Cada pessoa no seu papel:</h3>
                <ul className="mt-6 space-y-5">
                  {PAPEIS.map((p) => (
                    <li key={p.titulo}>
                      <p className="font-bold">{p.titulo}</p>
                      <p className="mt-1 text-[15px] text-white/70">{p.texto}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <p className={rotulo}>O que o Atacado Exp faz</p>
              <h2 className={tituloSecao}>Tudo o que o time de vendas usa, num lugar só</h2>
            </div>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {RECURSOS.map((r, i) => (
                <li key={r.titulo} className="rounded-2xl border border-[#1E1E1E]/10 bg-white/50 p-6">
                  <p className="text-3xl font-medium text-[#1E1E1E]/25">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-lg font-bold leading-snug">{r.titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#1E1E1E]/70">{r.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-[#1F1F1F] text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <p className={rotulo}>Como funciona</p>
              <h2 className={tituloSecao}>Como funciona a conexão com o WhatsApp</h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/60">Quatro passos, feitos pelo administrador da empresa.</p>
            </div>
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PASSOS.map((p, i) => (
                <li key={p.titulo} className="rounded-2xl border border-white/10 p-7">
                  <p className="text-3xl font-medium text-white/30">{String(i + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-lg font-bold">{p.titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/65">{p.texto}</p>
                </li>
              ))}
            </ol>
            <p className="mx-auto mt-8 max-w-3xl rounded-2xl border border-white/10 border-l-2 border-l-white p-6 text-[15px] leading-relaxed text-white/85">
              A conexão usa a API Oficial do WhatsApp Business, da Meta. O envio de modelos de mensagem segue as regras
              da Meta e é cobrado por ela direto na conta da empresa. O número conectado deixa de funcionar no
              aplicativo do WhatsApp do celular.
            </p>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="text-center">
              <p className={rotulo}>Seus dados</p>
              <h2 className={tituloSecao}>Os dados da sua empresa são da sua empresa</h2>
            </div>
            <ul className="mx-auto mt-12 max-w-3xl space-y-3">
              {DADOS.map((d) => (
                <li
                  key={d}
                  className="flex items-center gap-4 rounded-2xl border border-[#1E1E1E]/10 bg-white/50 px-6 py-5 text-[15px]"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4ADE80]/20">
                    <Check className="size-3.5 text-green-700" aria-hidden />
                  </span>
                  {d}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-center text-[15px]">
              <Link href="/politica-de-privacidade" className="underline underline-offset-4 hover:opacity-70">
                Leia a Política de Privacidade
              </Link>
            </p>
          </div>
        </section>

        <section className="bg-[#1F1F1F] text-center text-white">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <p className={rotulo}>Próximo passo</p>
            <h2 className={tituloSecao}>Seu time já vende. O Atacado Exp organiza.</h2>
            <div className="mt-10">
              <BotaoEntrar claro>Entrar no Atacado Exp</BotaoEntrar>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-[#1F1F1F] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-12 text-center text-sm text-white/60 sm:px-6">
          <div className="text-white">
            <Logo escuro />
          </div>
          <p className="text-white/85">Atacado Exp é um produto da SETE ADS LTDA.</p>
          <p>
            CNPJ 22.987.352/0001-15
            <br />
            Rua Carlos Roberto de Melo, 475, Pavimento 11, Sala 05, Parque Gabriel, Hortolândia/SP, CEP 13186-604
          </p>
          <p>
            Contato:{" "}
            <a href={`mailto:${EMAIL_CONTATO}`} className="break-all underline underline-offset-4 hover:text-white">
              {EMAIL_CONTATO}
            </a>
          </p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/politica-de-privacidade" className="hover:text-white">
              Política de Privacidade
            </Link>
            <Link href="/termos-de-servico" className="hover:text-white">
              Termos de Serviço
            </Link>
          </nav>
          <p>© {new Date().getFullYear()} Sete Ads. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
