// Termo de responsabilidade do canal direto (B3-01).
//
// O texto e a versão moram aqui, num lugar só: a tela exibe e o backend
// bloqueia lendo o mesmo valor. Em dois lugares, um dia a tela mostraria uma
// versão e o registro guardaria outra.
//
// **Mudou o texto, muda a versão.** O aceite guarda a versão aceita, e aceite
// de versão antiga não vale para a nova — é o que a spec pede e o que faz o
// registro ter valor como prova.

/** Data da última revisão do texto, em ISO curto. Serve como versão. */
export const VERSAO_DO_TERMO = "2026-09-17"

export type SecaoDoTermo = { titulo: string; paragrafos: string[] }

export const TERMO_DO_CANAL_DIRETO: {
  titulo: string
  versao: string
  secoes: SecaoDoTermo[]
} = {
  titulo: "Termo de responsabilidade — canal direto",
  versao: VERSAO_DO_TERMO,
  secoes: [
    {
      titulo: "O que é o canal direto",
      paragrafos: [
        "O canal direto conecta o seu número lendo um QR Code, do mesmo jeito que o WhatsApp Web. Ele não passa pela API Oficial da Meta e, por isso, opera fora dos Termos de Serviço do WhatsApp.",
        "Em troca, você conecta em minutos, sem aprovação da Meta, e pode enviar qualquer mensagem sem depender de template aprovado.",
      ],
    },
    {
      titulo: "O risco é o bloqueio do número",
      paragrafos: [
        "O WhatsApp pode bloquear o número a qualquer momento, sem aviso e sem explicação. Acontece com mais frequência com número novo, com disparo em volume e quando muita gente marca as suas mensagens como spam.",
        "Bloqueio não tem recurso garantido, e ele é do número — não da sua conta no CRM. Um número bloqueado precisa ser substituído por outro.",
      ],
    },
    {
      titulo: "O que reduz o risco",
      paragrafos: [
        "Aqueça número novo: comece com poucos envios por dia e aumente ao longo de semanas. O CRM faz isso sozinho, e os limites do aquecimento não podem ser desligados.",
        "Fale com quem quer falar com você. Lista comprada, número que nunca teve contato com a sua empresa e mensagem repetida em massa são o caminho mais curto para o bloqueio.",
        "Deixe claro quem está falando e ofereça saída fácil. Cliente que sabe como pedir para não receber mais não denuncia.",
        "Responda. Conversa de mão dupla é o sinal mais forte de que o número não é robô.",
      ],
    },
    {
      titulo: "De quem é a responsabilidade",
      paragrafos: [
        "A responsabilidade pelo número, pelo conteúdo enviado e pelas consequências do uso do canal direto é sua. O CRM oferece as proteções de ritmo, aquecimento e freio de emergência, mas não pode garantir que o número não será bloqueado.",
        "Se preferir não correr esse risco, conecte o número pela API Oficial da Meta. Os dois canais funcionam no mesmo workspace, e cada número usa o seu.",
      ],
    },
  ],
}

export type AceiteDoTermo = {
  terms_version: string
  accepted_at: string
  accepted_by: string
}

/**
 * O aceite vale para a versão vigente?
 *
 * Aceite de versão anterior não vale: o texto mudou, e o que o cliente leu não
 * é o que está valendo agora.
 */
export function aceiteEstaVigente(
  aceite: Pick<AceiteDoTermo, "terms_version"> | null,
  versaoVigente: string = VERSAO_DO_TERMO
): boolean {
  return aceite?.terms_version === versaoVigente
}
