# B10-02: Servidor na região do banco e porteiro só onde precisa

**Tipo:** Implementação
**Página:** Servidor por trás de todas as páginas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-navegacao-fluida.md`

## Descrição

Fixar a região das funções do Vercel na mesma região do projeto Supabase
(conferir a região do banco antes) e enxugar o porteiro: rotas públicas,
webhooks e crons passam sem consultar a sessão, e o porteiro deixa de rodar
para arquivos estáticos, fontes, imagens e rotas de API que já se validam.

Cobre, em "Servidor por trás de todas as páginas": porteiro só consulta a
sessão em rotas que exigem login; porteiro não roda para estáticos, fontes,
imagens, webhooks e crons; servidor na mesma região do banco.

## Pronto quando

No CRM publicado, a região das funções mostrada no painel do Vercel é a mesma
do Supabase; uma chamada a um webhook ou cron não gera consulta de sessão; e um
clique no menu, medido nas ferramentas do navegador, gasta menos tempo de
resposta do servidor do que antes da mudança, com o mesmo banco vazio.

## Cenários

### Happy Path
1. Usuário logado clica em "Alertas". O porteiro roda, vê que a rota exige
   login, consulta a sessão uma vez e deixa passar. A função do Vercel roda em
   `pdx1` (Oregon), mesma região AWS `us-west-2` do projeto Supabase
   `crm-exponencial` (confirmado via `supabase projects list`).
2. Um webhook da Meta chega em `/api/webhooks/whatsapp`. O porteiro nem roda:
   `/api` está fora do matcher. A rota valida a assinatura por conta própria,
   como já faz.
3. O navegador pede `/fonts/...` ou `favicon.ico`. O porteiro nem roda.

### Edge Cases
- Rota pública com usuário logado (`/login`, `/`): o porteiro devolve
  `next()` sem consultar a sessão; a página continua igual à de hoje.
- Sessão perto de expirar: a consulta em rotas protegidas continua renovando
  o cookie, como antes. Rotas públicas não renovam, e não precisam.
- Prefetch de links do menu: continua passando pelo porteiro (rota
  protegida), o que é correto.

### Cenário de Erro
- Se o Supabase Auth falhar, o comportamento é o atual: sem usuário, redireciona
  para `/login`.

## Banco de Dados
Não se aplica.

## Arquivos

- **Modificar:** `vercel.json` — adicionar `"regions": ["pdx1"]`.
- **Modificar:** `src/middleware.ts` — checar rota pública antes de criar o
  client e consultar a sessão; matcher passa a excluir `api/`, `fonts/`,
  `favicon.ico` e extensões estáticas (svg, png, jpg, jpeg, gif, webp, ico,
  woff, woff2, ttf, css, js, map, txt, xml, webmanifest).

## Dependências Externas
Nenhuma.

## Checklist

- [x] `vercel.json` com `regions: ["pdx1"]`
- [x] `src/middleware.ts` sem consulta de sessão em rota pública
- [x] Matcher sem `api/`, fontes e estáticos
- [x] `npm run build` passando; `curl` local em `/api/cron/sequencias` e `/login` sem chamada ao Auth
- [x] Após deploy, região das funções no painel do Vercel = pdx1
