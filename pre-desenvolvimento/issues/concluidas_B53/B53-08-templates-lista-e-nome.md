# B53-08: Templates: lista certa com chip e API Oficial, erro visível e nome final antes de enviar

**Tipo:** Implementação
**Página:** Configurações — Templates
**Repositório:** `crm-exponencial`
**Spec:** `docs/specs-arquivadas/spec-correcoes-qa-roteiro-luan.md`

## Descrição

A tela busca o número da API Oficial mesmo com chip na empresa, mostra erro quando a Meta recusa, mostra o nome final do template e o servidor confere o nome.

## Pronto quando

A lista de templates aparece na empresa de teste e "Teste Luan" mostra `teste_luan` antes de enviar.

## Critérios de aceite

- **CA-B53-15** (automática) — Lista de templates com chip e API Oficial. Dado uma empresa com um número do canal direto e um da API Oficial, quando o Admin abre a tela de templates, então a lista vem do número da API Oficial.
- **CA-B53-16** (automática) — Falha da Meta aparece como erro. Dado a Meta respondendo com erro à consulta de templates, quando o Admin abre a tela, então a tela mostra "Não foi possível carregar os templates da Meta" e não uma lista vazia.
- **CA-B53-17** (automática) — Nome final do template aparece antes de enviar. Dado o formulário de novo template, quando a pessoa digita "Teste Luan", então a tela mostra que o nome enviado será `teste_luan`.
- **CA-B53-18** (automática) — Servidor confere o nome do template. Dado um pedido de criação com o nome "Promoção-Já", quando ele chega ao servidor, então é recusado com a mensagem do que é aceito, sem chamar a Meta.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. O Admin abre `/configuracoes/templates` numa empresa com chip (canal `gateway`) e API Oficial (canal `meta`).
2. `listarTemplates` busca a conexão filtrando `canal = 'meta'` e consulta a Meta com o `waba_id` dela; a lista aparece.
3. No "Novo template", a pessoa digita "Teste Luan" e vê logo abaixo que o nome enviado será `teste_luan`.
4. Ao criar, `criarTemplate` aplica a mesma conversão (`nome-do-template.ts`), confere o resultado e só então chama a Meta.

### Edge Cases
- Empresa com mais de uma conexão `meta`: usa a primeira (`limit(1)`), em vez de quebrar no `maybeSingle`.
- Nome que continua inválido depois da conversão ("Promoção-Já" → `promoção-já`): a tela já avisa pelo nome final, e o servidor recusa sem chamar a Meta.
- Nome vazio: a tela não mostra nome final; o servidor recusa com "Nome é obrigatório".

### Cenário de Erro
- A Meta responde com erro (ou a rede falha) à consulta: `listarTemplates` devolve `erro: "Não foi possível carregar os templates da Meta"` e a tela mostra essa frase no lugar do "Nenhum template criado ainda".
- Sem número da API Oficial ou sem permissão: segue como hoje (lista vazia; a página já trata a empresa sem número `meta`).

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B53-15 | automática | `src/test/templates-lista-e-nome.test.tsx` | com uma conexão `gateway` e uma `meta` na empresa, `listarTemplates` consulta a Meta com o `waba_id` e o token da conexão `meta` e devolve a lista dela |
| CA-B53-16 | automática | `src/test/templates-lista-e-nome.test.tsx` | com a Meta respondendo erro, `listarTemplates` devolve o erro "Não foi possível carregar os templates da Meta", e a tela mostra essa frase e não "Nenhum template criado ainda" |
| CA-B53-17 | automática | `src/test/templates-lista-e-nome.test.tsx` | digitando "Teste Luan" no formulário, a tela mostra `teste_luan` como nome que será enviado |
| CA-B53-18 | automática | `src/test/templates-lista-e-nome.test.tsx` | `criarTemplate` com "Promoção-Já" devolve a mensagem do que é aceito e o `fetch` da Meta não é chamado |

## Banco de Dados

Nada muda. Leitura de `whatsapp_connections.canal` (`'meta'` ou `'gateway'`, não nulo).

## Arquivos

- **Criar:** `src/app/(auth)/configuracoes/templates/nome-do-template.ts` — a conversão do nome (`nomeFinalDoTemplate`) e a conferência (`conferirNomeDoTemplate`), usadas pela tela e pelo servidor.
- **Modificar:** `src/app/(auth)/configuracoes/templates/actions.ts` — `obterConexao` filtra `canal = 'meta'` com `limit(1)`; `listarTemplates` devolve `{ templates, erro? }` e não esconde o erro da Meta; `criarTemplate` confere o nome antes de chamar a Meta.
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` — passa `templates` e `erro` para a tela.
- **Modificar:** `src/app/(auth)/configuracoes/templates/templates-client.tsx` — mostra o erro de carregamento, o nome final ao digitar e usa a função compartilhada.
- **Criar:** `src/test/templates-lista-e-nome.test.tsx` — testes da tabela Prova.
- **Modificar:** `src/test/ajuda-onde-falta-explicacao.test.tsx` — o teste da B48-15 acompanha o novo retorno de `listarTemplates` e o filtro de canal no cliente falso (L-05).

## Checklist

- [x] Criar `nome-do-template.ts` com a conversão e a conferência
- [x] `obterConexao` filtra o canal `meta`
- [x] `listarTemplates` devolve o erro da Meta em vez de lista vazia
- [x] `criarTemplate` recusa nome inválido sem chamar a Meta
- [x] Página e tela mostram o erro de carregamento
- [x] Tela mostra o nome final ao digitar
- [x] Ajustar o teste da B48-15 ao novo retorno
