# B16-04: Protótipo — Pedidos no CRM

**Tipo:** Protótipo
**Página:** Pedidos (`/catalogo/pedidos`), Perfil do contato
**Spec:** `pre-desenvolvimento/spec-catalogo.md` — seções "Pedidos" e "Perfil do contato"

## Descrição

Lista e detalhe de pedidos com dados de exemplo e sem gravar: filtros, situações, aviso de
estoque insuficiente ao fechar, contador de Novos no menu e a seção "Pedidos do catálogo"
no perfil do contato.

## Pronto quando

No CRM publicado, a Marcelle abre a lista de pedidos de exemplo, abre um detalhe, vê a
troca de situação e a seção de pedidos no perfil do contato.

## Cenários

### Happy Path
1. Aba **Pedidos** (`/catalogo/prototipo/pedidos`), aberta para **todos os papéis**
   (Atendente também), com o contador de Novos na própria aba.
2. Lista do mais novo para o mais antigo: número, data e hora (Brasília), cliente (nome e
   WhatsApp), peças, total, situação. Filtros: situação, período (hoje, 7 dias, 30 dias,
   tudo) e busca por nome ou WhatsApp.
3. Clicar abre o **detalhe** ao lado (no celular, por cima): itens com foto, variação,
   quantidade, preço e subtotal; total; cliente com links para o perfil e a conversa;
   histórico de situação (quem e quando).
4. Botões de situação conforme o caminho: Novo → **Em atendimento** → **Fechado**, e
   **Cancelar** em qualquer um que não esteja cancelado.
5. **Fechar** com estoque insuficiente: diálogo listando os itens que faltam (pedido x
   estoque) e avisando que o estoque vai a zero; confirmar ou desistir.
6. **Cancelar um pedido Fechado**: confirmação dizendo que o estoque volta.
7. Abaixo, a seção **"Pedidos do catálogo"** como vai aparecer no perfil do contato da
   cliente selecionada (número, data, total, situação).

### Edge Cases
- Lista vazia (filtro sem resultado ou nenhum pedido): mensagem explicando.
- Pedido cancelado: sem botões de situação; só o histórico.
- O contador de Novos do **menu** do CRM entra na B16-10 (precisa de dado real); no
  protótipo o contador fica na aba Pedidos.

### Cenário de Erro
- Sem banco: as mudanças valem só na tela; recarregar volta aos pedidos de exemplo.

## Arquivos

- **Criar:** `src/app/(auth)/catalogo/components/situacao-pedido.ts` — situações, rótulos, cores e transições permitidas (o servidor reaproveita na B16-10)
- **Criar:** `src/app/(auth)/catalogo/components/lista-pedidos.tsx` — filtros, busca e lista (apresentacional)
- **Criar:** `src/app/(auth)/catalogo/components/detalhe-pedido.tsx` — itens, cliente, histórico, mudar situação, aviso de estoque e confirmação de cancelamento (apresentacional)
- **Criar:** `src/app/(auth)/catalogo/components/secao-pedidos-contato.tsx` — seção do perfil do contato (apresentacional)
- **Modificar:** `src/app/(auth)/catalogo/components/abas-catalogo.tsx` — contador opcional na aba Pedidos
- **Modificar:** `src/app/(auth)/catalogo/prototipo/dados-exemplo.ts` — pedidos de exemplo
- **Modificar:** `src/app/(auth)/catalogo/prototipo/prototipo-produtos-client.tsx` — aba Pedidos ligada nos `HREFS_PROTOTIPO`
- **Criar:** `src/app/(auth)/catalogo/prototipo/pedidos/page.tsx` + `prototipo-pedidos-client.tsx` — rota temporária, todos os papéis (sai na B16-10)

> Reuso: `formatarDataCurta` e `formatarHoraDoDia` de `src/lib/datas.ts` (fuso de
> Brasília); `formatarPreco`; `Badge`, `Button`, `Dialog`.

## Checklist

- [x] Situações e transições
- [x] Lista com filtros e busca
- [x] Detalhe com itens, cliente, histórico e mudança de situação
- [x] Aviso de estoque insuficiente ao fechar e confirmação ao cancelar fechado
- [x] Seção do perfil do contato
- [x] Contador na aba Pedidos; rota aberta a todos os papéis
- [x] `npm run build` e `npm run lint` passam
- [x] Conferência visual (Admin e Atendente) (03/10: filtros, busca por WhatsApp, aviso de estoque ao fechar, cancelar fechado, seção do perfil; Atendente vê só Pedidos)
- [x] Commit + push (`e6141b0`); deploy Ready (03/10)
