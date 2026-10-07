# B20-03: Campanha só usa número e dados da própria empresa

**Tipo:** Implementação
**Página:** Campanhas (`/campanhas`)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-2.md` — módulo 2

## Descrição

Toda campanha passa a ser conferida contra a empresa de quem age: ao salvar (número
escolhido), ao confirmar (campanha e destinatários) e na hora de disparar (credencial do
número). Códigos de campanha ou de número de outra empresa são recusados.

## Pronto quando

Criar, editar, confirmar, agendar e disparar campanha continuam funcionando; e testes
automatizados provam que salvar com número de outra empresa é recusado, que o disparo
nunca usa a credencial de número alheio (a campanha falha com motivo no relatório) e que
salvar ou confirmar com o código de campanha de outra empresa é recusado sem mexer nos
destinatários dela.

## Cenários

### Happy Path
1. **Salvar rascunho** (`salvarRascunho`, `campanhas/actions.ts`): quando há número
   escolhido, confere que `whatsapp_connections.id` é da empresa do perfil antes de gravar.
2. **Editar campanha existente:** o update passa a devolver a linha (`.select("id")`); se
   nenhuma linha da empresa foi alcançada, devolve erro — hoje devolve `{ id }` mesmo sem
   mexer em nada, e `confirmarCampanha` seguia apagando e recriando destinatários com a
   chave de serviço.
3. **Confirmar:** como depende do `salvarRascunho`, só segue para os destinatários se a
   campanha for da empresa.
4. **Motor** (`processarCampanha` em `src/lib/campanhas.ts`): lê a conexão por `id` **e**
   `workspace_id` da campanha, e lê os destinatários por `campaign_id` **e** `workspace_id`.
   Conexão de outra empresa = sem número → destinatários falham com
   `MOTIVO_SEM_NUMERO` (já aparece no relatório), sem usar credencial alheia.

### Edge Cases
- Número escolhido nulo continua válido ("número da empresa", como antes).
- Número da empresa com status diferente de conectado: salvar continua aceitando (como
  hoje); o motor já trata número desconectado.
- Campanha em status que não aceita edição (`enviando`, `enviada`…): o update não alcança
  linha → erro "Não foi possível salvar a campanha" (antes, silêncio).

### Cenário de Erro
- Número de outra empresa: "Número de WhatsApp inválido para esta campanha", nada gravado.
- Código de campanha de outra empresa: "Não foi possível salvar a campanha", destinatários dela intactos.

## Arquivos

- **Modificar:** `src/app/(auth)/campanhas/actions.ts` — `salvarRascunho` confere o número e exige linha alcançada no update.
- **Modificar:** `src/lib/campanhas.ts` — filtros por `workspace_id` na conexão e nos destinatários.
- **Criar:** `src/test/campanhas-seguranca.integration.test.ts` — actions contra o Supabase real (Gerente da empresa A com número e campanha da empresa B).
- **Criar:** `src/test/campanhas-motor-seguranca.test.ts` — motor com banco em memória (não dá para chamar o motor real em teste: ele processa as campanhas "enviando" de produção).

## Checklist

- [x] `salvarRascunho` recusa número de outra empresa e campanha de outra empresa
- [x] Motor filtra conexão e destinatários pela empresa da campanha
- [x] Testes novos passando; testes de campanhas existentes passando; build e lint ok
