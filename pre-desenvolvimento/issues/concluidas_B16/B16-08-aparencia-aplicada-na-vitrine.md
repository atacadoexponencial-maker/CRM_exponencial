# B16-08: Aparência da loja aplicada na vitrine

**Tipo:** Implementação
**Página:** Aparência da loja, Vitrine pública
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seção "Aparência da loja" e o item "Visual 100% da loja" da Vitrine pública
**Depende de:** B16-07 e B16-02 aprovado

## Descrição

A tela de aparência grava logo, banner, nome, texto de boas-vindas, cores, fonte e layout,
com prévia ao vivo e aviso de contraste; a vitrine pública e a prévia do link no WhatsApp
passam a usar a marca da loja nos três layouts, sem nenhuma marca do CRM.

## Pronto quando

Em produção, o Admin troca logo, cores, fonte e layout, vê a prévia mudar, salva, e a
vitrine pública abre com a identidade nova; descartar volta ao que estava salvo.

## Cenários

### Happy Path
1. Aba **Aparência** (`/catalogo/aparencia`, Admin/Gerente): o editor da B16-02 com o
   tema salvo da empresa e a prévia com os **produtos reais** da loja.
2. Logo e banner vão direto ao armazenamento (URL assinada, como as fotos de produto);
   salvar grava nome, boas-vindas, cores, fonte e layout.
3. A vitrine pública e a página do produto passam a usar o tema salvo; a aba do
   navegador e a prévia do link usam o nome da loja e a logo.

### Edge Cases
- Sem tema salvo: aparência padrão com o nome da empresa (como na B16-07).
- Servidor confere: nome 1–60, boas-vindas até 140, cores `#rrggbb`, fonte da lista,
  layout da lista, logo/banner só da pasta da empresa.
- Logo até 2 MB (PNG, JPG, SVG, WebP); banner até 5 MB (PNG, JPG, WebP).
- Trocar ou remover logo/banner apaga o arquivo antigo do armazenamento.
- **Ícone da aba**: a vitrine não pode mostrar o ícone do CRM — usa a logo da loja; sem
  logo, nenhum ícone.
- Prévia do link no WhatsApp: imagem = banner, ou logo se não for SVG (o WhatsApp não
  mostra SVG).
- O contraste continua só avisando (não bloqueia salvar): a decisão é do lojista.

### Cenário de Erro
- Falha ao enviar imagem: erro ao lado do campo; o resto fica como estava.
- Falha ao salvar: mensagem no topo; as escolhas não salvas ficam na tela.

## Banco de Dados

- `catalog_settings` ganha: `store_name`, `welcome_text`, `logo_path`, `banner_path`,
  `primary_color`, `background_color`, `font_id`, `layout` (todas com padrão; checks de
  formato)
- Migration: `supabase/migrations/20261003000009_catalogo_aparencia.sql` (só acrescenta)

## Arquivos

- **Criar:** `supabase/migrations/20261003000009_catalogo_aparencia.sql`
- **Criar:** `src/app/(auth)/catalogo/aparencia/actions.ts` — carregar tema, preparar envio de logo/banner, salvar
- **Criar:** `src/app/(auth)/catalogo/aparencia/page.tsx` + `aparencia-client.tsx`
- **Modificar:** `src/lib/catalogo/regras.ts` — ids de fonte e layouts válidos, limites de logo/banner
- **Modificar:** `src/app/loja/components/fontes.ts` — `IdFonte` vem dos ids de `regras.ts`
- **Modificar:** `src/lib/catalogo/loja-publica.ts` — tema salvo na loja pública
- **Modificar:** `src/app/loja/[endereco]/layout.tsx` — ícone da aba e imagem da prévia
- **Modificar:** `src/app/(auth)/catalogo/produtos-client.tsx` — aba Aparência ativa
- **Modificar:** `src/app/(auth)/catalogo/components/editor-aparencia.tsx` — banner sem SVG
- **Apagar:** `src/app/(auth)/catalogo/prototipo/aparencia/` — protótipo sai
- **Mover:** `src/app/favicon.ico` → `public/favicon.ico` e **Modificar:** `src/app/layout.tsx` — o ícone do CRM declarado no layout raiz em vez da convenção de arquivo (que entra em toda página e aparecia na aba da loja)
- **Modificar:** `src/app/(auth)/catalogo/prototipo/compartilhado.tsx`, `dados-exemplo.ts` — sem o que só a aparência usava
- **Modificar:** `src/test/catalogo-loja-publica.integration.test.ts` — casos da B16-08

## Checklist

- [x] Migration aplicada
- [x] Tela de Aparência real com prévia de produtos reais
- [x] Logo e banner pelo armazenamento, antigos apagados
- [x] Vitrine, produto, título, ícone e prévia do link com a marca
- [x] Protótipo de aparência removido
- [x] Testes de integração (12/12 em `catalogo-loja-publica.integration.test.ts`, 5 novos)
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual (03/10: prévia com produtos reais, logo pelo armazenamento, loja com título, fundo, fonte, Destaques, logo, og:image e ícone da loja; logo removida some do armazenamento; ícone do CRM só no CRM)
- [x] Commit + push (`bd68eea`); deploy Ready (03/10)
