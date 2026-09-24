// Protótipo B9-01: os estados novos do cartão de um número do canal direto —
// pausa, pausa longa, reconexão e as saídas quando ela falha.
//
// Rota temporária, fora do menu, com dados fixos: nenhuma chamada ao gateway e
// nenhuma gravação. Sai do repositório na B9-03, quando o último estado estiver
// ligado aos dados reais.

import { redirect } from "next/navigation"
import { Power, QrCode, RefreshCw, Smartphone, Trash2 } from "lucide-react"
import { createClient } from "@/integrations/supabase/server"
import { Button } from "@/components/ui/button"
import { CartaoNumero, type NumeroConectado } from "../canal-direto/cartao-numero"
import { AvisoDoNumero } from "../canal-direto/aviso-do-numero"

const NUMERO = {
  id: "exemplo",
  canal: "gateway",
  phone_number: "5521993911946",
  display_name: "Mah Joias",
  state_reason: null,
} as const

function numero(state: NumeroConectado["state"]): NumeroConectado {
  return { ...NUMERO, state }
}

function BotaoReconectar() {
  return (
    <Button variant="outline" size="sm">
      <QrCode className="size-3.5" aria-hidden />
      Reconectar
    </Button>
  )
}

function BotaoRemover() {
  return (
    <Button variant="outline" size="sm">
      <Trash2 className="size-3.5" aria-hidden />
      Remover
    </Button>
  )
}

function AcoesDePausa() {
  return (
    <div className="flex flex-wrap gap-2">
      <BotaoReconectar />
      <BotaoRemover />
    </div>
  )
}

function AcoesDeConectado() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm">
        <Power className="size-3.5" aria-hidden />
        Desconectar
      </Button>
      <Button variant="outline" size="sm">
        <Smartphone className="size-3.5" aria-hidden />
        Encerrar no aparelho
      </Button>
      <BotaoRemover />
    </div>
  )
}

const TEXTOS_DE_EFEITO = [
  {
    acao: "Desconectar",
    texto:
      "O número para de enviar e receber na hora, e o celular deixa de mostrar o CRM como ativo. A sessão fica guardada: para voltar, basta reconectar — sem ler o QR Code de novo.",
  },
  {
    acao: "Encerrar no aparelho",
    texto:
      "A sessão é encerrada no celular e o CRM sai de “Aparelhos conectados”. Para voltar, será preciso ler um novo QR Code.",
  },
  {
    acao: "Remover",
    texto:
      "O número sai do CRM e a conexão é apagada, junto com a sessão, as mídias guardadas e as mensagens que ainda estavam na fila. As conversas continuam no histórico. Não tem volta.",
  },
]

function Exemplo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
        {rotulo}
      </p>
      {children}
    </div>
  )
}

export default async function PrototipoPausaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (perfil?.role !== "admin") redirect("/perfil")

  return (
    <div className="max-w-5xl mx-auto w-full px-4 py-8">
      <h1 className="text-xl font-semibold">Protótipo — pausa e reconexão</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">
        B9-01. Dados de exemplo: nada aqui fala com o gateway.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <Exemplo rotulo="1. Desconectado a pedido, há 3 dias">
          <CartaoNumero
            numero={numero("disconnected")}
            desdeQuando="Desconectado há 3 dias"
            acoes={<AcoesDePausa />}
          />
        </Exemplo>

        <Exemplo rotulo="2. Pausa longa, há 11 dias">
          <CartaoNumero
            numero={numero("disconnected")}
            desdeQuando="Desconectado há 11 dias"
            aviso={
              <AvisoDoNumero variante="pausa_longa">
                Este número está desconectado há 11 dias. Se o celular dele ficar mais de 14
                dias sem usar o WhatsApp, o WhatsApp pode desfazer a conexão, e aí será preciso
                ler um QR Code novo. Reconecte para evitar.
              </AvisoDoNumero>
            }
            acoes={<AcoesDePausa />}
          />
        </Exemplo>

        <Exemplo rotulo="3. Reconectando">
          <CartaoNumero
            numero={numero("connecting")}
            acoes={
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled>
                  <RefreshCw className="size-3.5 animate-spin" aria-hidden />
                  Reconectando…
                </Button>
              </div>
            }
          />
        </Exemplo>

        <Exemplo rotulo="4. Voltou">
          <CartaoNumero
            numero={numero("connected")}
            aviso={
              <AvisoDoNumero variante="voltou">
                Número reconectado. Ele já pode receber e enviar mensagens.
              </AvisoDoNumero>
            }
            acoes={<AcoesDeConectado />}
          />
        </Exemplo>

        <Exemplo rotulo="5. Caiu, tentando voltar (não é pausa)">
          <CartaoNumero
            numero={numero("disconnected")}
            aviso={
              <AvisoDoNumero variante="tentando_voltar">
                A conexão com o aparelho caiu. O canal está tentando voltar sozinho.
              </AvisoDoNumero>
            }
            acoes={<AcoesDePausa />}
          />
        </Exemplo>

        <Exemplo rotulo="6. Sessão acabou">
          <CartaoNumero
            numero={numero("disconnected")}
            desdeQuando="Desconectado há 16 dias"
            aviso={
              <AvisoDoNumero
                variante="sessao_acabou"
                acao={
                  <Button size="sm">
                    <QrCode className="size-3.5" aria-hidden />
                    Ler QR Code novo
                  </Button>
                }
              >
                Não foi possível reconectar: a sessão foi encerrada no aparelho. Para voltar, leia
                um QR Code novo — o número continua o mesmo.
              </AvisoDoNumero>
            }
            acoes={<div className="flex flex-wrap gap-2"><BotaoRemover /></div>}
          />
        </Exemplo>
      </div>

      <h2 className="text-base font-semibold mt-12 mb-1">Textos de confirmação revisados</h2>
      <p className="text-sm text-muted-foreground mb-4">
        O que cada diálogo diz antes de o admin confirmar.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {TEXTOS_DE_EFEITO.map(({ acao, texto }) => (
          <div key={acao} className="rounded-lg border p-4">
            <p className="font-medium text-sm">{acao}</p>
            <p className="text-sm text-muted-foreground mt-2">{texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
