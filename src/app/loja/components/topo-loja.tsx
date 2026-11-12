"use client"

// Topo de perfil da vitrine (B61-01): banner de largura total, logo redonda sobre ele,
// nome, Instagram, boas-vindas e "Compartilhar catálogo". Centralizado em quadro
// estreito (celular) e alinhado à esquerda em quadro largo (computador). Só desenha.

import { useEffect, useRef, useState } from "react"
import { Check, Share2 } from "lucide-react"
import { coresDaVitrine, type TemaLoja } from "./tema"

/** A logo do lojista inteira dentro de um círculo branco; sem logo, a inicial do nome. */
export function LogoRedonda({ tema, className, comNome = false }: { tema: TemaLoja; className: string; comNome?: boolean }) {
  const cores = coresDaVitrine(tema)
  const inicial = tema.nomeLoja.trim().charAt(0).toUpperCase()
  return (
    <span
      data-logo-redonda
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border ${className}`}
      style={tema.logoUrl ? { background: "#ffffff", borderColor: cores.borda } : { background: cores.principal, color: cores.sobrePrincipal, borderColor: cores.borda }}
    >
      {tema.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tema.logoUrl} alt={comNome ? `Logo de ${tema.nomeLoja}` : ""} className="size-full object-contain p-[15%]" />
      ) : (
        <span aria-hidden className="font-semibold leading-none">{inicial}</span>
      )}
    </span>
  )
}

interface TopoLojaProps {
  tema: TemaLoja
  /** Caminho da vitrine (ex.: "/loja/minha-loja"); sem ele (a prévia da Aparência) o botão não compartilha. */
  hrefLoja?: string
}

export function TopoLoja({ tema, hrefLoja }: TopoLojaProps) {
  const cores = coresDaVitrine(tema)
  const [textoAberto, setTextoAberto] = useState(false)
  const [textoCortado, setTextoCortado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const paragrafo = useRef<HTMLParagraphElement>(null)
  // Vem validado do servidor; aqui só se desenha.
  const instagram = tema.instagram
  const boasVindas = tema.boasVindas.trim()

  // "ver mais" só quando o texto não cabe nas duas linhas.
  useEffect(() => {
    const el = paragrafo.current
    if (!el || textoAberto) return
    const medir = () => setTextoCortado(el.scrollHeight > el.clientHeight + 1)
    medir()
    if (typeof ResizeObserver === "undefined") return
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [boasVindas, textoAberto])

  // No celular abre a folha de compartilhar do aparelho; onde não há, copia o link.
  async function compartilhar() {
    if (!hrefLoja) return
    const url = new URL(hrefLoja, window.location.origin).toString()
    try {
      if (navigator.share) {
        await navigator.share({ title: tema.nomeLoja, url })
        return
      }
      await navigator.clipboard.writeText(url)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2000)
    } catch {
      // a pessoa cancelou a folha de compartilhar, ou o navegador não deixou copiar
    }
  }

  return (
    <section aria-label={`Sobre ${tema.nomeLoja}`} data-topo-loja>
      {tema.bannerUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={tema.bannerUrl} alt="" fetchPriority="high" data-banner-loja className="w-full aspect-[3/1] @3xl:aspect-[4/1] object-cover" />
      )}
      <div className="max-w-6xl mx-auto px-4 flex flex-col items-center text-center gap-3 @3xl:flex-row @3xl:items-start @3xl:text-left @3xl:gap-5">
        <LogoRedonda tema={tema} comNome className={`size-24 @3xl:size-28 text-4xl shadow-sm ${tema.bannerUrl ? "-mt-12 @3xl:-mt-14" : "mt-5"}`} />
        <div className={`min-w-0 flex-1 space-y-1 ${tema.bannerUrl ? "@3xl:pt-3" : "@3xl:pt-7"}`}>
          <h1 className="text-xl @3xl:text-2xl font-semibold leading-tight">{tema.nomeLoja}</h1>
          {instagram && (
            <a
              href={`https://instagram.com/${instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-6 items-center text-sm underline-offset-2 hover:underline"
              style={{ color: cores.suave }}
            >
              @{instagram}
            </a>
          )}
          {boasVindas && (
            <div>
              <p ref={paragrafo} className={`text-sm leading-relaxed whitespace-pre-line ${textoAberto ? "" : "line-clamp-2"}`} style={{ color: cores.suave }}>
                {boasVindas}
              </p>
              {(textoCortado || textoAberto) && (
                <button type="button" onClick={() => setTextoAberto((v) => !v)} aria-expanded={textoAberto} className="min-h-8 text-sm font-medium underline underline-offset-2">
                  {textoAberto ? "ver menos" : "ver mais"}
                </button>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={compartilhar}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-5 text-sm font-medium ${tema.bannerUrl ? "@3xl:mt-3" : "@3xl:mt-7"}`}
          style={{ borderColor: cores.borda, background: cores.fundo }}
          aria-live="polite"
        >
          {linkCopiado ? <Check className="size-4" style={{ color: cores.principal }} /> : <Share2 className="size-4" />}
          {linkCopiado ? "Link copiado" : "Compartilhar catálogo"}
        </button>
      </div>
    </section>
  )
}
