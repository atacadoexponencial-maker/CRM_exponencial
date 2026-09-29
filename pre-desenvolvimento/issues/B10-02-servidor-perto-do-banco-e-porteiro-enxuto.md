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
