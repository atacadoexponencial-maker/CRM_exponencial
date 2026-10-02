# B13-05: Mensagem recebida ou cadastro com o mesmo telefone tira o contato da lixeira

**Tipo:** Implementação
**Página:** Chat (recebimento pela API Oficial e pelo canal direto)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Quando chega mensagem de um telefone cujo contato está na lixeira — pelo webhook da API
Oficial ou pelo canal direto (gateway) —, o contato é restaurado sozinho (mesmo efeito
do "Restaurar" da B13-04) e a mensagem entra na conversa como qualquer mensagem
recebida. O mesmo vale ao criar lead ("Novo lead" no pipeline) ou contato (Contatos) com
o telefone de quem está na lixeira: o contato é restaurado e o lead novo entra ligado a
ele (decisão da Marcelle no `/plan` da B13-02). Nenhuma mensagem de cliente se perde nem
cria contato duplicado.

**Push:** a série só vai ao ar ao fim desta issue — antes dela, mensagem de contato na
lixeira cairia numa conversa escondida.

Depende de B13-04.

## Pronto quando

Com o chip de teste: excluir um contato, mandar mensagem do celular dele, e a conversa
aparece na caixa de entrada com o histórico antigo e a mensagem nova; o contato sai da
lixeira e volta ao funil. E criar "Novo lead" com o telefone de um contato na lixeira o
traz de volta, com o card novo no funil.

## Cenários

### Happy Path
1. **Mensagem pela API Oficial** (`api/webhooks/whatsapp/route.ts`): ao achar o contato
   pelo telefone, se ele estiver na lixeira, sai dela antes de a mensagem ser gravada. A
   conversa, o histórico e os cards voltam (as regras de leitura só os escondiam), a
   mensagem entra como qualquer outra e a caixa de entrada recebe o aviso de sempre.
2. **Mensagem pelo canal direto** (`lib/whatsapp/recebimento.ts`, `acharOuCriarContato`):
   igual.
3. **Novo lead** (`criarNovoLead`): o contato do telefone é restaurado **antes** de criar o
   card — senão o card nasceria invisível e a criação falharia.
4. **Novo contato** (`criarContato`): se o telefone é de um contato na lixeira, ele é
   restaurado (com o histórico; os dados antigos ficam) e a ação devolve o id dele, como se
   tivesse criado. O aviso "número já cadastrado" (`verificarNumeroDuplicado`) deixa de
   contar contato na lixeira.
5. Em todos os casos, o chat aberto em outra aba volta a mostrar as conversas do contato
   (transmissão `contato_restaurado`, par do `contato_excluido` da B13-02). O mesmo vale
   para "Restaurar" da lixeira.

### Edge Cases
- Contato ativo: nada muda — a checagem lê `excluido_em` na mesma consulta que já existe,
  sem ida extra ao banco a cada mensagem.
- Duas mensagens seguidas do mesmo contato na lixeira: a segunda já o encontra ativo; a
  restauração filtra `excluido_em is not null`, então não há escrita repetida.
- Sequências canceladas na exclusão continuam canceladas (premissa aprovada).
- Webhook de status de entrega de mensagem de contato na lixeira: não restaura (só
  mensagem recebida do cliente restaura).
- `criarNovoLead` com nome vazio continua sobrescrevendo o nome com nulo (comportamento
  que já existe; fora do escopo).

### Cenário de Erro
- Falha ao restaurar no webhook/gateway: a mensagem é gravada mesmo assim (nunca se perde
  mensagem de cliente); ela fica escondida até alguém restaurar o contato pela lixeira.
- Falha ao restaurar no `criarNovoLead`/`criarContato`: erro como hoje ("Erro ao criar ou
  localizar contato" / "Erro ao criar contato. Tente novamente.").

## Banco de Dados

Sem mudança de schema.

## Arquivos

- **Criar:** `src/lib/lixeira.ts` — `tirarDaLixeira(svc, workspaceId, contactId)`: limpa
  `excluido_em/excluido_por` (só se estiver na lixeira) e transmite `contato_restaurado`.
  Única forma de restaurar; usada pela lixeira e pelos quatro pontos abaixo.
- **Modificar:** `src/lib/whatsapp/realtime.ts` — `transmitirContatoRestaurado`.
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — ouvir
  `contato_restaurado` e tirar o contato do conjunto de excluídos.
- **Modificar:** `src/app/(auth)/contatos/lixeira/actions.ts` — `restaurarContato` passa a
  usar `tirarDaLixeira`.
- **Modificar:** `src/app/api/webhooks/whatsapp/route.ts` — restaura ao receber mensagem.
- **Modificar:** `src/lib/whatsapp/recebimento.ts` — `acharOuCriarContato` restaura.
- **Modificar:** `src/app/(auth)/pipeline/actions.ts` — `criarNovoLead` restaura antes do card.
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — `criarContato` restaura e devolve o
  id; `verificarNumeroDuplicado` ignora contato na lixeira.

## Dependências Externas

Nenhuma.

## Checklist

- [x] `src/lib/lixeira.ts` e `transmitirContatoRestaurado`
- [x] Chat ouve `contato_restaurado`
- [x] Lixeira usa `tirarDaLixeira`
- [x] Webhook da Meta e canal direto restauram ao receber mensagem
- [x] Novo lead e novo contato restauram
- [x] Verificação no banco real (teste temporário): evento do canal direto simulado e
      webhook da Meta simulado restauram e gravam a mensagem; novo lead e novo contato
      restauram; contato ativo não muda — 5/5 com teste temporário (webhook com assinatura HMAC real), 02/10
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build`, testes existentes do webhook,
      recebimento, pipeline e contatos — 211/215; as 4 falhas são as antigas do webhook (3 de status em `mensagens.integration` e 1 de assinatura em `caixa-de-entrada.integration`), iguais sem esta mudança
- [x] Push da série (B13-01 a 05) e deploy no ar (`645db56`, deploy Vercel com sucesso, 02/10)
- [ ] Teste com o chip real, **com autorização da Marcelle** (memória: perguntar antes de
      agir no número dela)
