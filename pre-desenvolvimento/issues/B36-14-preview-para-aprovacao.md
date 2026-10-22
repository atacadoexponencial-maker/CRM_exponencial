# B36-14: Preview para aprovação e regressão

**Tipo:** Implementação
**Página:** Todas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Rodar toda a suíte de testes do sistema, preparar a empresa de teste com dados em todas as telas e publicar a série num endereço de preview para a Marcelle aprovar antes de ir para o ar.

## Pronto quando

Existe um endereço de preview com a série inteira, a empresa de teste tem conteúdo em todas as telas e todos os testes do sistema passam.

## Critérios de aceite

- **CA-B36-28** (automática) — Nenhuma função some. Dado os testes automáticos que o sistema já tem (de tela, de ponta a ponta e de regra), quando eles rodam depois da mudança, então todos passam, ajustados só no que é aparência (nome de classe, cor, posição), nunca no que conferem de comportamento.
- **CA-B36-37** (manual) — Preview com a empresa de teste pronta. Dado a mudança publicada num endereço de preview, quando a Marcelle entra com o login da empresa de teste, então todas as telas abrem com conteúdo (contatos, cards, conversas, tarefas, vendas, campanhas, sequências e automações de teste), e nada vai para o ar antes da aprovação dela.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- A suíte inteira de testes roda depois da série: 1.380 testes; os 69 que falharam juntos (limite de login do Supabase e tempo esgotado nos testes de tela, como já registrado nas memórias do projeto) passaram um por um, nos 35 arquivos (22/10/2026).
- O build de produção passa.
- A empresa de teste ganha conteúdo em todas as telas (`e2e/preview/popular-empresa-teste-b36.cjs`) e o branch `b36-tema-claro-caderno` vai para o preview da Vercel; nada vai para o master antes da aprovação da Marcelle.
- A faixa de números fica legível no celular (cada número pega a largura que precisa) e o tempo de espera do "Esperando resposta" passa a ser contado no servidor (o lint barrava a conta durante a renderização).

### Edge Cases
- O roteiro de dados só mexe na empresa "[TESTE]", não envia nada pelo WhatsApp e pode rodar de novo.
- Teste que falhar só por limite de login ou tempo é rodado de novo sozinho, antes de ser tratado como defeito.

### Cenário de Erro
- Roteiro sem o login de teste no `.env.local`: para com a mensagem "o login de teste (B11_TESTE_EMAIL) não foi encontrado".

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-28 | automática | `src/test/b36-nenhuma-funcao-some.test.ts` | nenhum arquivo de teste de antes da série sumiu e nenhum teste foi pulado; a suíte inteira passa (resultado acima) |
| CA-B36-37 | manual | roteiro abaixo | o preview abre com a empresa de teste e todas as telas têm conteúdo |

### Roteiro manual — CA-B36-37
1. Abra o endereço do preview e entre com o login da empresa de teste.
2. Passe por todas as telas do menu: todas abrem e têm conteúdo (conversas, cards, tarefas, vendas, sequência, campanha e automação de teste).
3. Confira que a produção (crm-exponencial.vercel.app) continua com o visual de antes.
4. Aprove se estiver tudo certo para ir para o ar.

## Arquivos

- **Modificar:** `e2e/preview/README.md` — os dois roteiros novos
- **Criar:** `e2e/preview/fotos-das-telas.cjs` — fotografa as telas nos dois temas
- **Criar:** `e2e/preview/popular-empresa-teste-b36.cjs` — dá conteúdo a todas as telas da empresa de teste
- **Modificar:** `src/app/(auth)/dashboard/actions.ts` — o tempo de espera é contado no servidor
- **Modificar:** `src/app/(auth)/dashboard/components/blocos-do-dia.tsx` — mostra o tempo de espera vindo do servidor
- **Modificar:** `src/components/shared/faixa-de-numeros.tsx` — faixa legível no celular
- **Modificar:** `src/lib/painel-dashboard.ts` — minutos de espera e o texto deles separados
- **Criar:** `src/test/b36-nenhuma-funcao-some.test.ts` — nenhum teste de antes sumiu nem foi pulado
- **Criar:** `src/test/b36-testes-de-antes.json` — lista dos arquivos de teste do master antes da série

## Checklist

- [x] Suíte inteira rodada e falhas de limite conferidas uma a uma
- [x] Build de produção
- [x] Lint sem erro novo
- [x] Empresa de teste preenchida
- [x] Branch publicado para o preview

## Testes manuais

| Critério | Conferido por | Dia |
|---|---|---|
| CA-B36-37 | Marcelle | 22/10/2026 |
