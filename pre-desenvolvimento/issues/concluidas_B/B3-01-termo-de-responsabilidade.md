# B3-01: Termo de responsabilidade do canal direto

**Tipo:** Implementação
**Módulo:** B3 — Termo de Responsabilidade
**Repositório:** `CRM_exponencial`

## Contexto

O canal direto conecta o número por leitura de QR Code e opera **fora dos Termos de Serviço do WhatsApp**: o risco de o número do cliente ser banido é real, e a responsabilidade pelo número é dele. Antes da primeira conexão por esse canal no workspace, o cliente precisa aceitar isso de forma explícita e registrada. Sem aceite, não conecta.

## O que construir

1. **Texto do termo**, versionado, explicando em português claro: que o canal não é oficial, que o número pode ser banido pelo WhatsApp a qualquer momento, quais são as boas práticas que reduzem o risco, e que a responsabilidade pelo número é do cliente.
2. **Confirmação de aceite** — marcação obrigatória antes de prosseguir, exibida no caminho do canal direto, antes de a instância ser criada.
3. **Registro de aceite** em banco: quem aceitou, quando, e qual versão do texto.
4. **Bloqueio real, no backend**: enquanto não houver aceite da versão vigente, a criação de conexão pelo canal direto é recusada. Esconder o botão não é o bloqueio — é só a parte visível dele.
5. **Consulta do aceite** do workspace, para a tela saber se precisa exibir o termo e para o registro poder ser auditado depois.
6. **Nova versão exige novo aceite**: quando o texto muda, a versão muda, e o aceite antigo deixa de valer.

## Comportamentos da spec cobertos

- [x] Exibir o termo antes da primeira conexão pelo canal direto no workspace
- [x] Impedir a conexão enquanto o termo não é aceito
- [x] Registrar o aceite com autor, data e versão do termo
- [x] Consultar o aceite registrado do workspace
- [x] Exigir novo aceite quando o texto do termo muda

## Contrato do gateway

Nenhum endpoint do gateway é chamado aqui. O termo é anterior à criação da instância: o bloqueio acontece **antes** do `POST /instances` que a B2-02 implementou.

## Arquivos

- **Criar:** `supabase/migrations/<timestamp>_create_gateway_terms_acceptance.sql` — tabela de aceite (workspace, autor, data, versão) e RLS no padrão de `20260426000002_create_whatsapp_connections.sql`: membros leem o do próprio workspace, Admin registra
- **Criar:** `src/lib/whatsapp/gateway/termo.ts` — texto do termo e a versão vigente, num lugar só, para o backend e a tela lerem o mesmo valor
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/termo-responsabilidade.tsx` — texto, marcação de aceite e ação de confirmar. Usar `Dialog` (`src/components/ui/dialog.tsx`) e `Button`, no padrão de diálogo já usado em `acoes-whatsapp.tsx`
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/actions.ts` — action que registra o aceite, action ou consulta que informa se o termo vigente já foi aceito, e a recusa na criação de conexão pelo canal direto sem aceite. Padrão do arquivo: `"use server"`, autorização dentro da action por `profiles.role`, retorno `{ erro?: string }`
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/escolha-canal.tsx` — o caminho do canal direto passa pelo termo quando ele ainda não foi aceito
- **Modificar:** `src/integrations/supabase/types.ts` — regerar com `supabase gen types typescript --linked`
- **Criar:** `src/test/whatsapp-termo.test.ts` — aceite registrado, ausência de aceite bloqueando a criação, e versão nova exigindo aceite novo. Banco mockado, como manda `pre-desenvolvimento/testes/plano-testes-B1.md`

## Depende de

- **B2-01** — protótipo do fluxo de conexão
- **B2-02** — a criação de conexão pelo canal direto, que é o que passa a ser bloqueado
- Migration aplicada com `npx supabase db push --linked`

## Critérios de aceite

- [x] Workspace sem aceite: ao escolher o canal direto, o termo aparece antes de qualquer outra coisa
- [x] Sem marcar a confirmação, não é possível prosseguir
- [x] Chamar a criação de conexão pelo canal direto sem aceite é recusado **no backend**, mesmo com a tela contornada
- [x] O registro guarda quem aceitou, quando e a versão do texto
- [x] Workspace que já aceitou a versão vigente não vê o termo de novo
- [x] Subir a versão do texto faz o termo voltar a aparecer, e o aceite antigo continua guardado no histórico
- [x] A conexão pela API Oficial da Meta **não** é afetada pelo termo
- [x] Registrar aceite recusa quem não é Admin
- [x] `npm run build`, `npm run lint` e `npm test` passam

## Fora de escopo

- Termo para o canal da Meta — a API Oficial já tem os termos da própria Meta
- Assinatura eletrônica, PDF ou envio por e-mail do termo
- Revisão jurídica do texto: escrever o texto é desta issue, aprovar o conteúdo é decisão da Marcelle
- Exibir o termo em `/termos-de-servico`, que é página pública e de outro assunto
