// Uma caixa por NÚMERO DONO, e o horário no fuso da operação.
//
// Os dois defeitos que estes testes travam apareceram juntos, em uso real com
// dois números conectados:
//
//  - o mesmo cliente escrevendo para dois números do workspace caía numa
//    conversa só, e a resposta saía pelo telefone errado;
//  - texto com tipo fora do mapa aparecia inteiro dentro da conversa mas com
//    "Mensagem não suportada por aqui" na prévia da lista;
//  - o horário vinha três horas à frente, porque o servidor formata em UTC.

import { describe, it, expect } from "vitest"
import {
  escolherConversaDoNumero,
  traduzirConteudo,
  type ConversaAbertaDoContato,
  type EventoMensagemRecebida,
} from "@/lib/whatsapp/recebimento"
import { formatarHoraDoDia, formatarHorarioDaLista, formatarDataCurta } from "@/lib/datas"

const NUMERO_1 = "aaaaaaaa-0000-0000-0000-000000000001"
const NUMERO_3 = "aaaaaaaa-0000-0000-0000-000000000003"

function conversa(id: string, dono: string | null): ConversaAbertaDoContato {
  return { id, unread_count: 0, whatsapp_connection_id: dono }
}

describe("a caixa é por número dono", () => {
  it("reusa a conversa do mesmo número", () => {
    const abertas = [conversa("conv_1", NUMERO_1)]

    expect(escolherConversaDoNumero(abertas, NUMERO_1)?.id).toBe("conv_1")
  })

  it("não entrega a conversa de OUTRO número — é o defeito relatado", () => {
    // Cliente já falava com o número 1; agora escreveu para o número 3.
    const abertas = [conversa("conv_do_numero_1", NUMERO_1)]

    expect(escolherConversaDoNumero(abertas, NUMERO_3)).toBeNull()
  })

  it("escolhe entre duas caixas abertas do mesmo contato", () => {
    const abertas = [conversa("conv_do_numero_3", NUMERO_3), conversa("conv_do_numero_1", NUMERO_1)]

    expect(escolherConversaDoNumero(abertas, NUMERO_1)?.id).toBe("conv_do_numero_1")
    expect(escolherConversaDoNumero(abertas, NUMERO_3)?.id).toBe("conv_do_numero_3")
  })

  it("conversa sem dono registrado adota o número que chegou", () => {
    const abertas = [conversa("conv_antiga", null)]

    expect(escolherConversaDoNumero(abertas, NUMERO_3)?.id).toBe("conv_antiga")
  })

  it("prefere a do mesmo número à que está sem dono", () => {
    const abertas = [conversa("conv_sem_dono", null), conversa("conv_do_numero_1", NUMERO_1)]

    expect(escolherConversaDoNumero(abertas, NUMERO_1)?.id).toBe("conv_do_numero_1")
  })

  it("sem saber a origem, vale o comportamento antigo: a mais recente", () => {
    const abertas = [conversa("mais_recente", NUMERO_3), conversa("mais_antiga", NUMERO_1)]

    expect(escolherConversaDoNumero(abertas, null)?.id).toBe("mais_recente")
  })

  it("contato sem conversa aberta abre caixa nova", () => {
    expect(escolherConversaDoNumero([], NUMERO_1)).toBeNull()
  })
})

describe("prévia de texto com tipo fora do mapa", () => {
  function evento(extra: Partial<EventoMensagemRecebida>): EventoMensagemRecebida {
    return { message_id: "3EB0", from: "5511999998888", type: "text", ...extra }
  }

  it("usa o texto na prévia, e não o aviso genérico", () => {
    const traduzido = traduzirConteudo(evento({ type: "extendedTextMessage", text: "Bom dia, tem no atacado?" }))

    expect(traduzido.previa).toBe("Bom dia, tem no atacado?")
    expect(traduzido.conteudo).toBe("Bom dia, tem no atacado?")
  })

  it("sem texto nenhum, o aviso continua — é tudo o que há para mostrar", () => {
    const traduzido = traduzirConteudo(evento({ type: "poll", text: null }))

    expect(traduzido.tipo).toBe("desconhecido")
    expect(traduzido.previa).toBe("Mensagem não suportada por aqui")
  })
})

describe("horário no fuso da operação", () => {
  // 16:05 em Brasília. Sem fuso escrito, o servidor da Vercel mostrava 19:05.
  const DEZESSEIS_HORAS = "2026-09-22T19:05:00.000Z"

  it("mostra a hora de Brasília, não a do servidor", () => {
    expect(formatarHoraDoDia(DEZESSEIS_HORAS)).toBe("16:05")
  })

  it("vale para a lista de conversas", () => {
    const agora = new Date("2026-09-22T19:30:00.000Z")

    expect(formatarHorarioDaLista(DEZESSEIS_HORAS, agora)).toBe("16:05")
  })

  it("23h de ontem é 'Ontem', mesmo faltando menos de 24 horas", () => {
    // 21/09 às 23:30 em Brasília, olhado dia 22 às 08:00 de Brasília.
    const ontemTarde = "2026-09-22T02:30:00.000Z"
    const agora = new Date("2026-09-22T11:00:00.000Z")

    expect(formatarHorarioDaLista(ontemTarde, agora)).toBe("Ontem")
  })

  it("dentro da semana mostra o dia, contado no fuso certo", () => {
    // 20/09/2026 é um domingo em Brasília.
    const domingo = "2026-09-20T15:00:00.000Z"
    const agora = new Date("2026-09-22T19:00:00.000Z")

    expect(formatarHorarioDaLista(domingo, agora)).toBe("Dom")
  })

  it("mais de uma semana mostra a data cheia", () => {
    const agora = new Date("2026-09-22T19:00:00.000Z")

    expect(formatarHorarioDaLista("2026-04-15T15:00:00.000Z", agora)).toBe(formatarDataCurta("2026-04-15T15:00:00.000Z"))
  })

  it("a data curta também respeita o fuso na virada do dia", () => {
    // 22/09 às 21:00 UTC é ainda 22/09 em Brasília (18:00).
    expect(formatarDataCurta("2026-09-22T21:00:00.000Z")).toContain("22")
    // 23/09 às 02:00 UTC é 22/09 em Brasília (23:00).
    expect(formatarDataCurta("2026-09-23T02:00:00.000Z")).toContain("22")
  })
})
