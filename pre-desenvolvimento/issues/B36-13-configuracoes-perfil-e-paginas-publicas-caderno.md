# B36-13: Configurações, perfil e páginas públicas no estilo Caderno

**Tipo:** Implementação
**Página:** /configuracoes/*, /perfil, /login, /cadastro e páginas legais
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Reorganizar as telas de configuração, o perfil, o login, o cadastro e as páginas legais na linguagem Caderno, sem perder nenhuma informação ou ação.

## Pronto quando

Essas telas seguem a linguagem Caderno, nada sumiu e a loja pública está igual a hoje.

## Critérios de aceite

- **CA-B36-35** (manual) — Configurações e Perfil aprovados visualmente. Dado o preview com a empresa de teste, quando a Marcelle abre cada tela de configuração e o perfil, nos dois temas, então ela aprova o visual e confere que nada sumiu.
- **CA-B36-36** (manual) — Páginas fora do sistema aprovadas visualmente. Dado o preview, quando a Marcelle abre o login, o cadastro, as páginas legais e a loja pública, então ela aprova o visual das primeiras e confere que a loja está igual a hoje.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-07 | No celular, a organização nova se adapta à tela pequena (colunas viram uma embaixo da outra, o Chat mostra uma coluna por vez, como hoje) | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
- Usuários, times, WhatsApp (com ritmo e saúde do número), etiquetas, mensagens rápidas, templates e o perfil ganham o título e as margens do Caderno, tabelas em livro-caixa, caixas na superfície e números em fonte de número.
- Login, cadastro, política de privacidade, termos de serviço e exclusão de dados ficam no claro (B36-01) com o mesmo acabamento.
- No perfil, as seções Dados do perfil e Segurança ficam separadas por linha fina.

### Edge Cases
- A loja pública não muda (é sempre clara, B36-01).
- Adicionar, desativar e reativar usuário; criar time; conectar número, QR code e pareamento por código; ritmo e saúde; etiquetas, mensagens rápidas e templates continuam iguais.

### Cenário de Erro
- Mensagens de erro de formulário e de ação no tom de erro do tema.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B36-35 | manual | roteiro abaixo | as telas de configuração e o perfil seguem o Caderno nos dois temas e nada sumiu |
| CA-B36-36 | manual | roteiro abaixo | login, cadastro e páginas legais seguem o Caderno no claro e a loja pública está igual a antes |

### Roteiro manual — CA-B36-35
1. Abra o preview e entre com a empresa de teste.
2. Abra Usuários, Times, WhatsApp, Etiquetas, Mensagens Rápidas e Templates; em cada uma, abra o diálogo de criar e cancele.
3. Abra Meu perfil e salve o nome sem mudar.
4. Repita no tema escuro.
5. Aprove se seguir o quadro (linha A, cor Grafite) e nada tiver sumido.
### Roteiro manual — CA-B36-36
1. Saia do sistema (menu do usuário → Sair) estando no tema escuro.
2. Confira o login: claro, com a logo grafite.
3. Abra o cadastro, a política de privacidade e os termos de serviço: claros.
4. Abra a loja pública da empresa de teste (/loja/teste-b11) e confira que está igual a antes.
5. Aprove se seguir o quadro (linha A, cor Grafite).

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/etiquetas-client.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/etiquetas/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/mensagens-rapidas/mensagens-rapidas-client.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/templates/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/templates/templates-client.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/times/acoes-time.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/times/criar-time-dialog.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/times/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/acoes-usuario.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/adicionar-usuario-dialog.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/usuarios/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/formulario-ritmo.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/ritmo/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/aviso-de-freio.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/cartao-saude.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/medidor-consumo.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/[id]/saude/saude-client.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/acoes-whatsapp.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/pareamento-por-codigo.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/tela-qr-code.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/conectar-teste-button.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/conectar-whatsapp-button.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/wizard-conexao.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/perfil/form-alterar-senha.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/perfil/form-perfil.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/(auth)/perfil/page.tsx` — título do Caderno e seções separadas por linha fina
- **Modificar:** `src/app/cadastro/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/exclusao-de-dados/[code]/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/login/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/not-found.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/politica-de-privacidade/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno
- **Modificar:** `src/app/termos-de-servico/page.tsx` — título, margens, tabelas, caixas e avisos no estilo Caderno

## Checklist

- [x] Título e margens do Caderno nas telas de configuração e no perfil
- [x] Tabelas em livro-caixa e caixas na superfície
- [x] Avisos de erro no tom do tema
- [x] Páginas públicas com o mesmo acabamento
