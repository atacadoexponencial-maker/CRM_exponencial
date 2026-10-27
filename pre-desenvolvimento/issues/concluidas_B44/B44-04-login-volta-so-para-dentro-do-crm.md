# B44-04: Login volta só para dentro do CRM

**Tipo:** Implementação
**Página:** Login
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-4.md`

## Descrição

O destino de volta depois do login passa a aceitar só páginas do próprio CRM, recusando variantes com barra invertida, tabulação ou quebra de linha que o navegador lê como outro site.

## Pronto quando

Um link de login com destino `/\outro-site` leva ao Dashboard depois de entrar, e um link para `/contatos?busca=ana` continua levando para a busca.

## Critérios de aceite

- **CA-B44-16** (automática) — Link de login não leva para fora do CRM. Dado um link de login cujo destino de volta é `/\` seguido de outro site, ou tem tabulação ou quebra de linha no começo, quando a pessoa entra com e-mail e senha certos, então ela cai no Dashboard do CRM, não no outro site
- **CA-B44-17** (automática) — Link de login para uma página do CRM continua funcionando. Dado um link de login com destino de volta `/contatos?busca=ana`, quando a pessoa entra, então ela cai na lista de contatos com a busca "ana"

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. A pessoa abre um link do CRM sem sessão; o porteiro manda para `/login?voltar=/contatos?busca=ana`.
2. Ela entra com e-mail e senha certos.
3. `destinoSeguro` interpreta o `voltar` como endereço dentro da origem do próprio CRM e devolve só caminho, busca e âncora; ela cai em `/contatos?busca=ana`.

### Edge Cases
- `voltar` com barra invertida (`/\outro-site`, `/\outro-site`), tabulação, quebra de linha ou outro caractere de controle: recusado, mesmo que o resto pareça caminho interno. O navegador lê esses casos como endereço de outro site.
- `voltar` que, interpretado, sai da origem do CRM (`//outro-site`, `https://outro-site`): recusado.
- `voltar` para `/login` ou `/cadastro`: recusado, como hoje.
- Sem `voltar`: Dashboard, como hoje.

### Cenário de Erro
- Destino recusado não mostra erro: a pessoa simplesmente cai no Dashboard.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B44-16 | automática | `src/test/login-volta-para-dentro.test.ts` | depois do login certo, `voltar` com `/\`, `/\`, tabulação ou quebra de linha seguidos de outro site leva ao `/dashboard` |
| CA-B44-17 | automática | `src/test/login-volta-para-dentro.test.ts` | depois do login certo, `voltar=/contatos?busca=ana` leva para `/contatos?busca=ana` |

## Arquivos

- **Modificar:** `src/app/login/destino.ts` — interpreta o destino com o leitor de endereços contra uma origem fixa, recusa barra invertida e caracteres de controle e devolve só caminho, busca e âncora
- **Criar:** `src/test/login-volta-para-dentro.test.ts` — CA-B44-16 e 17, chamando `realizarLogin` com o Supabase e os cabeçalhos simulados

## Checklist

- [x] `destinoSeguro` com leitor de endereços e recusa de barra invertida e caracteres de controle
- [x] Testes do CA-B44-16 e 17
