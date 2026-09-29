# B9-03: Cartão mostra há quanto tempo o número está pausado, e avisa a partir de 10 dias

**Tipo:** Implementação
**Página:** CRM — Configurações → WhatsApp (cartão do número do canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-desconectar-reconectar.md`
**Depende de:** B9-01 (forma aprovada) e A10-01 (pausa distinguível de queda)

## Descrição

O cartão passa a distinguir número desconectado a pedido de número que caiu (e
está tentando voltar), mostra desde quando o número está desconectado a pedido e,
a partir de 10 dias, exibe o aviso de que o WhatsApp pode desfazer a conexão se o
celular ficar mais de 14 dias sem uso, recomendando reconectar. O aviso some ao
reconectar.

Cobre, em "CRM — Configurações → WhatsApp", os comportamentos: Distinguir pausa
de queda no cartão, Ver há quanto tempo está desconectado, Ser avisado de pausa
longa e Ver o aviso sumir.

## Pronto quando

Um número desconectado a pedido mostra "Desconectado há N dias"; com a data da
desconexão recuada para 10 dias atrás, o cartão mostra o aviso de pausa longa, e
ao reconectar o aviso some. Um número que caiu por perda de conexão aparece como
"tentando voltar", e não como pausado.

## Cenários

### Happy Path
1. Admin desconecta o número: `operarNumeroCanalDireto("desconectar")` grava
   `status = disconnected`, `state_reason = null` e `disconnected_at = agora`.
2. A página lê `disconnected_at` junto com a conexão e calcula no servidor
   (`situacaoDaPausa`) o texto "Desconectado há N dias" e se a pausa é longa
   (≥ 10 dias). O cartão mostra o texto abaixo do nome; a partir de 10 dias,
   o aviso âmbar com o texto aprovado na B9-01.
3. Ao reconectar, o estado `connected` (webhook ou sondagem) limpa
   `disconnected_at`; a lista recarrega e o aviso some.

### Edge Cases
- Queda (`state_reason = connection_lost`): o cartão mostra "A conexão com o
  aparelho caiu. O canal está tentando voltar sozinho.", sem "há N dias".
- Sessão encerrada / banido: avisos próprios já existentes; nada muda.
- Pausa anterior à coluna (sem data): só o selo "Desconectado".
- Encerrar no aparelho e remover não gravam `disconnected_at`: não é pausa.
- Aviso de reconexão em curso (B9-02) tem prioridade sobre o de pausa.
- A rota temporária `prototipo-pausa` sai do repositório, como a B9-01 previa.

### Cenário de Erro
- Nenhum novo.

## Banco de Dados

- Tabela: `whatsapp_connections`
  - `disconnected_at` (timestamptz, nula) — instante da pausa pedida pelo admin;
    limpa ao voltar a `connected`.
- Migration `supabase/migrations/20260929000001_whatsapp_connections_disconnected_at.sql`,
  aplicada com `npx supabase db push --linked`; tipos regenerados.

## Arquivos

- **Criar:** a migration acima.
- **Criar:** `src/lib/whatsapp/gateway/pausa.ts` — `situacaoDaPausa`,
  `textoDePausaLonga`, `TEXTO_DE_QUEDA`, `DIAS_PARA_AVISO`.
- **Criar:** `src/test/whatsapp-pausa.test.ts`.
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado.
- **Modificar:** `src/lib/whatsapp/gateway/instancias.ts` — `disconnectedAt`
  na conexão listada.
- **Modificar:** `src/lib/whatsapp/eventos-de-operacao.ts` — `connected`
  limpa `disconnected_at`.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` —
  `desconectar` grava `disconnected_at`.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — calcula a
  situação e passa ao cartão.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx`
  — `NumeroConectado.pausa`.
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros.tsx`
  — `desdeQuando` e avisos de pausa longa / queda.
- **Modificar:** `src/test/gateway-instancias.test.ts` e
  `src/test/gateway-eventos-de-operacao.test.ts` — expectativas com o campo novo.
- **Apagar:** `src/app/(auth)/configuracoes/whatsapp/prototipo-pausa/page.tsx`.

## Dependências Externas
Nenhuma.

## Checklist

- [x] Migration aplicada e tipos regenerados
- [x] `situacaoDaPausa` com testes
- [x] Desconectar grava a data; conectar limpa
- [x] Cartão mostra "Desconectado há N dias", aviso de pausa longa e "tentando voltar"
- [x] Protótipo removido
- [x] `npm run lint`, `npm run build` e testes passando
- [ ] Conferido no CRM publicado: pausa mostra "há 0 dias"/"hoje"; data recuada para 10 dias mostra o aviso; reconectar some
