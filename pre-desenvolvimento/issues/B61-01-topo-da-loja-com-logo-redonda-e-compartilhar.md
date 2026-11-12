# B61-01: Topo da loja com logo redonda, Instagram e compartilhar

**Tipo:** Implementação
**Página:** Loja pública (vitrine) e Catálogo > Aparência
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-nova-vitrine-da-loja.md`

## Descrição

A vitrine troca a barra com a logo à esquerda por um topo de perfil sobre o banner: logo redonda, nome, @ do Instagram, boas-vindas e "Compartilhar catálogo", centralizado no celular e alinhado à esquerda no computador. O lojista preenche o Instagram na tela de Aparência.

## Pronto quando

O lojista salva o Instagram na Aparência, abre a loja e vê o banner de largura total com a logo redonda sobre ele, o nome, o @ que abre o Instagram, as boas-vindas com "ver mais" e o botão que compartilha o link da loja; a barra do alto segue com carrinho e "Repetir pedido".

## Critérios de aceite

- **CA-B61-01** (automática) — O topo mostra a logo redonda com nome, Instagram e boas-vindas. Dado uma loja com logo, nome, Instagram "@lojateste" e texto de boas-vindas, quando a cliente abre a loja, então ela vê a logo dentro de um círculo e, abaixo dela, o nome da loja, "@lojateste" e o texto de boas-vindas.
- **CA-B61-02** (automática) — Loja sem logo mostra a inicial do nome no círculo. Dado uma loja sem logo, com o nome "Bela Moda", quando a cliente abre a loja, então o círculo mostra a letra "B" e o nome "Bela Moda" aparece abaixo dele.
- **CA-B61-03** (automática) — Loja sem Instagram não mostra o @. Dado uma loja sem Instagram preenchido, quando a cliente abre a loja, então nenhum @ aparece no topo e nenhum espaço vazio fica no lugar dele.
- **CA-B61-04** (automática) — O @ abre o Instagram da loja. Dado uma loja com Instagram "@lojateste", quando a cliente toca no @, então abre em outra aba o endereço `https://instagram.com/lojateste`.
- **CA-B61-05** (manual) — O banner continua de uma borda à outra, com a logo sobre ele. Dado uma loja com banner e logo, aberta no celular e no computador, quando a Marcelle olha o topo, então o banner ocupa toda a largura da tela e a logo redonda fica metade sobre ele: centralizada no celular, à esquerda no computador.
- **CA-B61-06** (automática) — Loja sem banner mostra o topo sem buraco. Dado uma loja sem banner, quando a cliente abre a loja, então a logo redonda, o nome e o botão de compartilhar aparecem logo abaixo da barra da loja, e nenhuma imagem de capa é desenhada.
- **CA-B61-07** (automática) — "Compartilhar catálogo" entrega o link da loja. Dado a loja aberta em um aparelho com compartilhamento, quando a cliente toca em "Compartilhar catálogo", então o compartilhamento do aparelho abre com o nome da loja e o link da vitrine (não o de um produto).
- **CA-B61-08** (automática) — Sem compartilhamento no aparelho, o link é copiado. Dado a loja aberta em um navegador sem compartilhamento, quando a cliente toca em "Compartilhar catálogo", então o link da vitrine vai para a área de transferência e o botão mostra "Link copiado" por 2 segundos.
- **CA-B61-09** (automática) — Texto de boas-vindas longo abre com "ver mais". Dado uma loja com texto de boas-vindas de 300 caracteres, quando a cliente toca em "ver mais", então o texto inteiro aparece e o botão passa a dizer "ver menos".
- **CA-B61-10** (automática) — A barra da loja continua com carrinho e "Repetir pedido". Dado uma loja com 3 peças no carrinho e um pedido anterior guardado no aparelho, quando a cliente abre a loja, então a barra do alto mostra o carrinho com o número 3 e o botão "Repetir pedido", e os dois funcionam como antes.
- **CA-B61-50** (automática) — O lojista salva o Instagram e ele aparece na loja. Dado o lojista na tela de Aparência, quando ele digita "lojateste" no campo do Instagram e salva, então a tela confirma que salvou e a loja pública passa a mostrar "@lojateste".
- **CA-B61-51** (automática) — O campo aceita @, link e só o nome. Dado o campo do Instagram, quando o lojista salva "@lojateste", "https://instagram.com/lojateste/" ou "lojateste", então nos três casos fica guardado o mesmo perfil, "lojateste".
- **CA-B61-52** (automática) — Instagram inválido é recusado com aviso. Dado o campo do Instagram, quando o lojista digita "loja teste!" e salva, então a tela avisa "Use só letras, números, ponto e sublinhado, com até 30 caracteres." e nada é gravado (a recusa vale também para quem chama o salvamento sem passar pela tela).
- **CA-B61-53** (automática) — Limpar o campo tira o @ da loja. Dado uma loja com Instagram salvo, quando o lojista apaga o campo e salva, então a loja pública deixa de mostrar o @.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B61-01 | "Os outros pontos também" foi lido como o recorte recomendado na conversa (topo, categorias, faixa do atacado, cartão, lista contínua, página do produto, rodapé e barra), e não como frete, conta da cliente ou identificação antes do carrinho. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-10 | Loja sem logo mostra a inicial do nome no círculo, em vez de esconder o círculo. | confirmada | Marcelle, 10/11/2026. |
| SUP-B61-11 | A referência foi vista só no celular. No computador, o visual novo é o mesmo desenho, centralizado e com mais colunas, sem um modelo próprio. | invalidada | No computador o topo não é centralizado: fica alinhado à esquerda (ver a pergunta PER-B61-06). Marcelle, 10/11/2026. |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B61-05 | O banner continua? | respondida | Sim, de largura total, estilo e-commerce, com a logo redonda sobre ele. Marcelle, 10/11/2026. |
| PER-B61-06 | No computador, como ficam o topo e o conteúdo? | respondida | Topo alinhado à esquerda: logo redonda à esquerda sobre o banner, nome, @ e boas-vindas ao lado dela, "Compartilhar catálogo" na ponta direita. Busca, categorias e produtos continuam na coluna de largura máxima de hoje, com até 4 colunas de produtos. No celular o topo é centralizado. Marcelle, 10/11/2026. |
| PER-B61-07 | O texto de boas-vindas aceita hoje 140 caracteres; o limite muda? | respondida | Sobe para 300, para caber uma bio como a da referência; a loja mostra duas linhas e o "ver mais" abre o resto. Marcelle, 10/11/2026. |
| PER-B61-08 | Como a logo entra no círculo, se muitas logos são largas? | respondida | Inteira dentro do círculo, sem corte, sobre fundo branco redondo; o painel passa a sugerir imagem quadrada. Marcelle, 10/11/2026. |

## Cenários

### Happy Path
1. O lojista abre Catálogo > Aparência, digita `lojateste` em "Instagram da loja (opcional)" e salva. A tela confirma "Salvo. A loja já abre com a aparência nova."
2. A cliente abre `/loja/<endereço>`: barra do alto com a logo pequena redonda, o nome, "Repetir pedido" (se houver) e o carrinho; abaixo, o banner de largura total; sobre a borda de baixo do banner, a logo redonda; depois o nome, `@lojateste`, as boas-vindas em até duas linhas e "Compartilhar catálogo".
3. Ela toca no @ e o Instagram abre em outra aba; toca em "Compartilhar catálogo" e o aparelho abre o compartilhamento com o link da vitrine.
4. No computador (quadro largo), o mesmo topo fica alinhado à esquerda: logo à esquerda sobre o banner, nome, @ e boas-vindas ao lado, botão na ponta direita.

### Edge Cases
- Loja sem logo: o círculo mostra a inicial do nome, em maiúscula.
- Loja sem banner: o topo começa logo abaixo da barra, sem imagem de capa e sem sobreposição.
- Loja sem Instagram: o @ não é desenhado.
- Boas-vindas curtas (cabem em duas linhas): sem "ver mais".
- Campo do Instagram aceita `@lojateste`, `lojateste`, `https://instagram.com/lojateste/` e `instagram.com/lojateste?igsh=x`; guarda sempre `lojateste`, em minúsculas.
- Navegador sem compartilhamento: o link é copiado e o botão mostra "Link copiado" por 2 segundos.
- A cliente cancela a folha de compartilhar: nada acontece, sem erro.
- Prévia da Aparência: o botão "Compartilhar catálogo" aparece, mas não compartilha (não há link de loja na prévia).

### Cenário de Erro
- Instagram inválido (`loja teste!`, mais de 30 caracteres): a tela e o servidor respondem "Use só letras, números, ponto e sublinhado, com até 30 caracteres." e nada é gravado.
- Boas-vindas acima de 300 caracteres: o servidor responde "O texto de boas-vindas passa de 300 caracteres."
- Atendente tentando salvar: "Só Admin e Gerente mexem no catálogo.", como hoje.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B61-01 | automática | `src/test/loja-topo.test.tsx` | a logo aparece dentro do círculo do topo e, depois dela, o nome, "@lojateste" e as boas-vindas |
| CA-B61-02 | automática | `src/test/loja-topo.test.tsx` | sem logo, o círculo mostra "B" e o nome "Bela Moda" aparece abaixo |
| CA-B61-03 | automática | `src/test/loja-topo.test.tsx` | sem Instagram, nenhum @ nem link de Instagram no topo |
| CA-B61-04 | automática | `src/test/loja-topo.test.tsx` | o @ é um link para `https://instagram.com/lojateste` que abre em outra aba |
| CA-B61-05 | manual | roteiro abaixo | banner de borda a borda com a logo metade sobre ele, no celular e no computador |
| CA-B61-06 | automática | `src/test/loja-topo.test.tsx` | sem banner, nenhuma imagem de capa; logo, nome e botão presentes |
| CA-B61-07 | automática | `src/test/loja-topo.test.tsx` | o compartilhamento recebe o nome da loja e o link da vitrine, não o de um produto |
| CA-B61-08 | automática | `src/test/loja-topo.test.tsx` | sem compartilhamento, o link vai para a área de transferência e o botão diz "Link copiado" por 2 segundos |
| CA-B61-09 | automática | `src/test/loja-topo.test.tsx` | com 300 caracteres, "ver mais" mostra o texto inteiro e vira "ver menos" |
| CA-B61-10 | automática | `src/test/loja-topo.test.tsx` | a barra mostra o carrinho com 3 e "Repetir pedido", e os dois chamam as ações de antes |
| CA-B61-50 | automática | `src/test/loja-instagram.integration.test.ts` e `src/test/loja-topo.test.tsx` | salvar "lojateste" confirma na tela e a loja pública passa a devolver o Instagram |
| CA-B61-51 | automática | `src/test/loja-instagram.integration.test.ts` | "@lojateste", o link e "lojateste" gravam o mesmo perfil |
| CA-B61-52 | automática | `src/test/loja-instagram.integration.test.ts` e `src/test/loja-topo.test.tsx` | "loja teste!" mostra o aviso na tela, o servidor recusa e o valor gravado não muda |
| CA-B61-53 | automática | `src/test/loja-instagram.integration.test.ts` | limpar o campo e salvar tira o Instagram da loja pública |

### Roteiro manual — CA-B61-05
1. No preview da Vercel (banco de teste), entre na empresa "[TESTE] Automações B11". Em Catálogo > Configurações, confira que a loja está publicada, com endereço e número dos pedidos (em 10/11/2026 ela ainda não estava publicada no banco de teste; publique com o endereço `teste-b11`). Em Catálogo > Aparência, envie logo e banner se faltarem.
2. Abra a loja `/loja/teste-b11` no celular: o banner vai de uma borda à outra e a logo redonda fica centralizada, metade sobre o banner.
3. Abra a mesma loja no computador: o banner continua de borda a borda e a logo redonda fica à esquerda, metade sobre o banner, com o nome ao lado.

## Banco de Dados

- Tabela: `catalog_settings`
  - `instagram` (text, pode ser nulo, só `[a-z0-9._]`, 1 a 30 caracteres) — perfil do Instagram da loja, sem o @
  - `welcome_text` — o limite sobe de 140 para 300 caracteres

## Arquivos

- **Criar:** `supabase/migrations/20261110000002_catalogo_instagram_e_boas_vindas.sql` — coluna `instagram` e novo limite de `welcome_text`
- **Criar:** `src/app/loja/components/topo-loja.tsx` — topo de perfil: logo redonda, nome, @, boas-vindas com "ver mais" e "Compartilhar catálogo"
- **Criar:** `src/test/loja-topo.test.tsx` — testes de tela do topo, da barra e do campo na Aparência
- **Criar:** `src/test/loja-instagram.integration.test.ts` — salvar, normalizar, recusar e limpar o Instagram, no banco de teste
- **Modificar:** `src/lib/catalogo/regras.ts` — `normalizarInstagram`, `AVISO_INSTAGRAM` e `LIMITE_BOAS_VINDAS`
- **Modificar:** `src/app/loja/components/tema.ts` — `instagram` no `TemaLoja` e no tema padrão
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — lê `instagram` e o entrega no tema
- **Modificar:** `src/app/(auth)/catalogo/aparencia/actions.ts` — lê, valida e grava o Instagram; limite de 300 nas boas-vindas
- **Modificar:** `src/app/(auth)/catalogo/components/editor-aparencia.tsx` — campo do Instagram, limite de 300 e dica de logo quadrada
- **Modificar:** `src/app/loja/components/vitrine.tsx` — barra do alto com logo pequena redonda e nome; usa o `TopoLoja` no lugar do título e das boas-vindas; recebe o endereço da loja para compartilhar
- **Modificar:** `src/app/loja/[endereco]/loja-client.tsx` — entrega o endereço da vitrine para o compartilhar
- **Modificar:** `src/integrations/supabase/types.ts` — regenerado do banco de teste depois da migration (`supabase gen types --project-id cxqdiqhcvdecujlxthmd`)

Reuso: `coresDaVitrine` e `corTextoSobre` (`tema.ts`), o padrão de compartilhar de `pagina-produto.tsx` (`navigator.share` com cópia de reserva), `temaDasConfiguracoes` e `exigirGestor` como estão.

## Checklist

- [x] Migration criada e aplicada no banco de teste (`npm run db:teste:push`)
- [x] `types.ts` regenerado do banco de teste
- [x] `normalizarInstagram` e limites em `regras.ts`
- [x] Tema, leitura pública e ações da Aparência com o Instagram
- [x] Campo do Instagram, limite de 300 e dica da logo no editor
- [x] `TopoLoja` e barra do alto novas na vitrine, centralizado no celular e à esquerda no computador
- [x] Testes da tabela Prova escritos e passando
- [x] Testes que já renderizam a loja e a Aparência rodados (`catalogo-*`, `loja-*`, `tema*`)
- [x] `npx tsc --noEmit` e `npm run lint` limpos
