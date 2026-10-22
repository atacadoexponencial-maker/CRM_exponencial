# B36-02: Telas legíveis nos dois temas

**Tipo:** Implementação
**Página:** Todas (varredura de cores fixas)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Trocar toda cor escrita direto no código (texto branco fixo, avisos com texto colorido claro, fundos fixos) por cores que acompanham o tema, para nenhum texto sumir no claro.

## Pronto quando

Qualquer tela, aviso, erro ou confirmação do sistema é legível no claro e no escuro.

## Critérios de aceite

- **CA-B36-10** (automática) — Nenhum texto some no tema claro. Dado o código de todas as telas do sistema, quando se procura cor de texto ou de fundo escrita direto, que não muda com o tema (como texto branco fixo ou texto colorido claro de aviso, que no fundo claro fica ilegível), então não sobra nenhuma, fora as listadas como exceção de propósito (ex.: a loja pública).
- **CA-B36-11** (automática) — Avisos legíveis nos dois temas. Dado um aviso de atenção, um de erro e um de sucesso, quando eles aparecem no claro e no escuro, então o texto de cada um tem contraste de pelo menos 4,5:1 com o próprio fundo.

## Suposições

Nenhuma.

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
Toda cor de aviso, erro, sucesso, informação e cinza escrita direto no código passa a vir do tema (`text-aviso`, `bg-aviso-fundo`, `border-aviso/30`, `text-erro`, `text-sucesso`, `text-info`, `text-muted-foreground`...). Elas têm um valor no claro e outro no escuro, então o texto continua legível nos dois.

### Edge Cases
- Cor que separa categorias (laranja, roxo, rosa) e não tem papel de aviso: fica a cor do Tailwind com o par do escuro na mesma linha (`text-orange-700 dark:text-orange-300`).
- Cor de dado (perfil RFV, etapas do funil de clientes, séries de gráfico, etiquetas que o usuário escolhe, cores da loja): fica fixa, igual nos dois temas, listada como exceção no teste com o motivo.
- Sobreposição escura sobre foto ou mídia e fundo escurecido de janela: preto e branco fixos de propósito, listados como exceção.
- QR code: fundo branco fixo, para o celular ler.
- Mapa de calor da coorte: a célula clara leva o texto do tema; só a forte leva texto branco.

### Cenário de Erro
- Cor fixa nova escrita depois: o teste `CA-B36-10` acusa o arquivo e a linha.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-10 | automática | `src/test/tema-cores-fixas.test.ts` | nenhuma cor da paleta, branco/preto fixo ou cor em código nas telas, fora as exceções com motivo; cor de categoria sempre com o par do escuro |
| CA-B36-11 | automática | `src/test/tema-cores-fixas.test.ts` | aviso, erro, sucesso e informação com contraste ≥ 4,5:1 no próprio fundo, no fundo da página e na superfície, nos dois temas |

## Arquivos

- **Modificar:** `src/app/(auth)/alertas/alertas-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/campanhas/[id]/editor-campanha-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/campanhas/[id]/relatorio/relatorio-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/campanhas/campanhas-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/detalhe-pedido.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/editor-aparencia.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/editor-produto.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/form-configuracoes.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/lista-produtos.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/painel-categorias.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/previa-importacao.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/situacao-pedido.ts` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/components/variacoes-estoque.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/catalogo/importar/importar-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/chat/components/balao-mensagem.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/chat/components/item-conversa.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/chat/components/painel-contato.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/chat/components/painel-conversa.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/blocos-fluxo.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/editor-fluxo.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/lista-regras.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/components/painel-bloco.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/automacoes/historico/historico-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/templates/templates-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/formulario-ritmo.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/aviso-de-freio.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/indicador-aquecimento.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/medidor-consumo.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/sinal-de-risco.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/acoes-whatsapp.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/acoes-canal-direto.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/aviso-do-numero.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/escolha-canal.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/estado-badge.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/pareamento-por-codigo.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/tela-qr-code.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/termo-responsabilidade.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/wizard-conexao.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/contatos/[id]/components/perfil-contato.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/contatos/[id]/components/timeline-contato.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/contatos/components/lista-contatos.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/contatos/components/novo-contato-dialog.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/perfil/form-alterar-senha.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/perfil/form-perfil.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/perfil/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/pipeline/components/card-lead.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/pipeline/components/coluna-kanban.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/pipeline/components/painel-card.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/carteiras-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/cartoes-resumo.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/coorte-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/evolucao-perfis.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/funil-clientes-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/relatorios-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/rfv-client.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/(auth)/relatorios/components/variacao-por-uf.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/politica-de-privacidade/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/app/termos-de-servico/page.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/components/shared/iniciar-sequencia-dialog.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/components/shared/sidebar-nav.tsx` — cores fixas trocadas pelas cores do tema
- **Modificar:** `src/test/relatorios-rfv-evolucao.test.tsx` — confere a cor de queda pelo nome do tema (`text-erro`) em vez da cor fixa
- **Criar:** `src/test/tema-cores-fixas.test.ts` — varredura de cor fixa e contraste dos avisos

## Checklist

- [x] Trocar as cores de aviso, erro, sucesso, informação e cinza pelas do tema
- [x] Dar par do escuro às cores de categoria
- [x] Ajustar à mão branco e preto fixos (botão de alternar, passos do assistente, badges do menu, mapa de calor, anel da matriz RFV, caminho percorrido no fluxo, páginas legais)
- [x] Teste de varredura com as exceções e o motivo de cada uma
