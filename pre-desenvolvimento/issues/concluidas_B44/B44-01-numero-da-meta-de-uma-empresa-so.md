# B44-01: Número da Meta pertence a uma empresa só

**Tipo:** Implementação
**Página:** Configurações → WhatsApp; entrada de mensagens da Meta
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

Um id de número da Meta passa a existir em uma empresa só: a conexão pela janela da Meta recusa número já usado em outra empresa, ninguém grava conexão direto pelo banco, e o botão "Conectar número de teste" sai junto com a ação por trás dele.

## Pronto quando

O Admin de uma segunda empresa que tenta conectar um número já ligado a outra empresa vê "Este número já está conectado em outra empresa", e as mensagens da Meta continuam entrando só na empresa dona. O botão do número de teste não aparece mais.

## Critérios de aceite

- **CA-B44-01** (automática) — Número da Meta que já está em outra empresa é recusado. Dado a empresa A com o número da Meta de id X conectado, quando o Admin da empresa B conclui a conexão da Meta com o mesmo id X, então a tela de B avisa "Este número já está conectado em outra empresa", nenhuma conexão é criada em B, e a conexão de A continua igual
- **CA-B44-02** (automática) — Admin não grava conexão de número direto pelo banco. Dado um Admin logado da empresa B, quando ele tenta criar ou alterar uma conexão de número direto pela API do banco, sem passar pela tela (por exemplo, gravando o id X de A ou trocando o token), então o banco recusa e nada é gravado
- **CA-B44-03** (automática) — Mensagem da Meta entra só na empresa dona do número. Dado a empresa A com o número de id X e uma tentativa recusada de B com o mesmo id (CA-B44-01 e CA-B44-02), quando chega um webhook assinado da Meta com mensagem para o id X, então a mensagem aparece no chat de A e nada aparece em B
- **CA-B44-04** (automática) — O botão "Conectar número de teste" não existe mais. Dado um Admin em Configurações → WhatsApp, quando a tela abre, mesmo com a variável que liberava o número de teste ligada, então o botão "Conectar número de teste" não aparece, e chamar a ação antiga não cria conexão nenhuma

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B44-01 | Não há empresa de cliente com o mesmo id de número da Meta em duas empresas hoje, e o número de teste da Meta não está ligado a nenhuma empresa em uso. Se houver, a regra de número único é aplicada depois de remover as linhas sobrando | confirmada | Marcelle, 27/10/2026 |
| SUP-B44-10 | Na B44-01 a migration (revoke de insert/update em whatsapp_connections) é aplicada no banco ANTES de o código novo ir ao ar, para os testes rodarem. Na janela entre um e outro, só conectar, desconectar e reconectar número pela tela ficam recusados; não há clientes reais, e as duas coisas acontecem no mesmo dia | confirmada | Marcelle, 27/10/2026: pode, e cada issue vai ao ar assim que o revisildo der ✅, conferindo antes o estado do repo e da outra sessão |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Admin da empresa A abre Configurações → WhatsApp, passa pela janela da Meta e o assistente chama `completarConexaoWhatsApp` com `code`, `phoneNumberId` e `wabaId`.
2. Antes de falar com a Meta, o servidor confere (pela chave de serviço) que nenhuma outra empresa tem esse `phone_number_id`.
3. Troca o código pelo token, confere o número, registra e inscreve o webhook, como hoje.
4. Grava a conexão pela chave de serviço, com `workspace_id` da sessão.
5. A Meta manda mensagem para o número: o webhook acha uma conexão só e a mensagem entra no chat de A.

### Edge Cases
- Duas empresas concluem a conexão do mesmo número quase ao mesmo tempo: a conferência das duas passa, mas o índice único do banco recusa a segunda gravação, e ela vê o mesmo aviso de número já conectado.
- A empresa já tem um número: continua o aviso de hoje, "Já existe um número conectado".
- Desconectar e reconectar o próprio número continuam funcionando, agora gravando pela chave de serviço com o filtro da empresa.
- A variável `HABILITAR_NUMERO_TESTE_META` ligada no ambiente não faz mais nada: o botão e a ação deixam de existir.

### Cenário de Erro
- Número já em outra empresa: "Este número já está conectado em outra empresa." e nenhuma chamada à Meta é feita.
- Gravação direta pela API do banco (insert ou update em `whatsapp_connections` com o token do usuário): o banco recusa por falta de permissão.
- Falha da Meta: as mensagens de hoje continuam iguais.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-01 | automática | `src/test/numero-meta-unico.integration.test.ts` | Admin de B concluindo a conexão com o id já usado por A recebe "Este número já está conectado em outra empresa", B fica sem conexão, a de A não muda e a Meta não é chamada |
| CA-B44-02 | automática | `src/test/numero-meta-unico.integration.test.ts` | insert e update em `whatsapp_connections` pelo navegador do Admin de B (gravando o id de A e trocando o token) são recusados e nada muda no banco |
| CA-B44-03 | automática | `src/test/numero-meta-unico.integration.test.ts` | webhook assinado da Meta para o id de A cria a mensagem numa conversa de A e nada em B |
| CA-B44-04 | automática | `src/test/numero-teste-meta.test.tsx` | com `HABILITAR_NUMERO_TESTE_META=1`, o assistente não mostra "Usar número de teste" e o módulo de actions não exporta mais `conectarNumeroTeste` |

## Banco de Dados

- Tabela: `whatsapp_connections`
  - Índice único parcial em `phone_number_id` (onde não é nulo): um id de número da Meta em uma conexão só. Conferido em 27/10/2026 (leitura): 1 conexão com `phone_number_id`, sem repetição.
  - `revoke insert, update ... from anon, authenticated`: criar e alterar conexão só pela chave de serviço, depois de o servidor conferir empresa e papel. `select` por coluna (B19-03) e `delete` do Admin pela política atual continuam.

## Arquivos

- **Criar:** `supabase/migrations/20261027000001_numero_meta_de_uma_empresa_so.sql` — índice único e revoke de insert/update
- **Criar:** `src/test/numero-meta-unico.integration.test.ts` — CA-B44-01, CA-B44-02, CA-B44-03 no Supabase real, com empresas de teste criadas e apagadas pelo próprio teste
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — `completarConexaoWhatsApp` confere o número em outra empresa antes da Meta e grava pela chave de serviço (com a tradução do erro de unicidade); `desconectarWhatsApp` e `reconectarWhatsApp` gravam pela chave de serviço com o filtro da empresa; sai `conectarNumeroTeste` e o import de `numero-teste`
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — sai `numeroTesteHabilitado` e a prop do assistente
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/wizard-conexao.tsx` — sai o bloco "Usar número de teste", o estado e a prop `mostrarNumeroTeste`
- **Modificar:** `src/test/numero-teste-meta.test.tsx` — os testes da B21-05 viram o teste do CA-B44-04 (o arquivo não pode ser apagado: CA-B36-28 confere que os testes antigos continuam existindo)
- **Apagar:** `src/app/(auth)/configuracoes/whatsapp/numero-teste.ts` — sem uso depois da remoção
- **Apagar:** `src/app/(auth)/configuracoes/whatsapp/conectar-teste-button.tsx` — componente antigo, já sem uso

Reaproveita: `createServiceClient` (`@/integrations/supabase/service`) e o padrão de teste com "navegador da vez" de `src/test/atendente-contatos-seguranca.integration.test.ts`.

## Checklist

- [x] Migration com índice único parcial e revoke de insert/update
- [x] `completarConexaoWhatsApp`: conferência do número em outra empresa antes da Meta, gravação pela chave de serviço, erro 23505 vira o mesmo aviso
- [x] `desconectarWhatsApp` e `reconectarWhatsApp` pela chave de serviço com filtro da empresa
- [x] Remover `conectarNumeroTeste`, `numero-teste.ts`, `conectar-teste-button.tsx`, o bloco do assistente e a prop na página
- [x] Testes do CA-B44-01 a 04
- [x] **Ordem de publicação:** `db push` primeiro (os testes precisam do revoke), depois o código no ar no mesmo dia (SUP-B44-10)
