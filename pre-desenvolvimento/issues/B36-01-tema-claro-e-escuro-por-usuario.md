# B36-01: Tema claro e escuro por usuário

**Tipo:** Implementação
**Página:** Todas (fundação do tema)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-tema-claro-caderno.md`

## Descrição

Criar os dois temas (claro padrão, escuro opcional) com a paleta Caderno Grafite e as fontes IBM Plex, a troca no menu do usuário guardada no perfil, a logo certa para cada tema, login/cadastro/páginas legais no claro e a loja pública intacta.

## Pronto quando

Um usuário entra e vê o sistema no claro; troca para o escuro no menu do usuário e a tela muda na hora; entra em outro navegador e o escuro vem junto; o login aparece claro com a logo grafite e a loja pública está igual a hoje.

## Critérios de aceite

- **CA-B36-01** (automática) — Quem nunca escolheu vê o tema claro. Dado um usuário que nunca trocou o tema, quando ele entra no sistema, então todas as telas aparecem no tema claro (fundo de papel #F6F4EF, texto #1C1B18).
- **CA-B36-02** (automática) — Trocar o tema muda a tela na hora e guarda a escolha. Dado um usuário no tema claro, com uma conversa aberta no Chat, quando ele escolhe "Escuro" no menu do usuário, então a tela passa para o escuro sem recarregar, a conversa continua aberta e a escolha fica gravada no perfil dele.
- **CA-B36-03** (automática) — O tema acompanha o usuário em outro aparelho. Dado um usuário que escolheu "Escuro", quando ele entra por outro navegador, sem nada guardado, então o sistema aparece no escuro.
- **CA-B36-04** (automática) — A tela já nasce no tema certo, sem piscar. Dado um usuário que escolheu "Escuro", quando ele recarrega qualquer tela do sistema, então a primeira pintura da página já é escura (o HTML chega do servidor com o tema aplicado), sem um instante de tela clara antes.
- **CA-B36-05** (automática) — Cada usuário vê o próprio tema. Dado a Ana no escuro e o Caio no claro, usando o mesmo navegador, quando a Ana sai e o Caio entra, então o Caio vê o claro.
- **CA-B36-06** (automática) — Login, cadastro e páginas legais no claro. Dado um visitante sem login, quando ele abre o login, o cadastro, a política de privacidade, os termos de serviço, a exclusão de dados ou uma página que não existe, então a página aparece no tema claro, com a logo escura.
- **CA-B36-07** (automática) — A loja pública não muda. Dado um vendedor que escolheu o tema escuro e está logado no mesmo navegador, quando ele abre a loja pública da empresa e a página de um produto, então a loja aparece clara, igual a hoje (mesmas cores, fontes e disposição).
- **CA-B36-08** (automática) — A logo troca de versão com o tema. Dado um usuário no claro, quando ele vê o menu lateral (e a barra do celular), então a logo aparece em grafite; ao trocar para o escuro, aparece a logo branca de hoje.
- **CA-B36-09** (automática) — Todo texto tem contraste para leitura, nos dois temas. Dado a paleta dos dois temas, quando se mede o contraste de cada par texto/fundo usado no sistema (texto e texto secundário sobre fundo, menu e superfície; destaque sobre fundo; texto do botão principal; alta, queda e aviso sobre os fundos), então todos os pares têm contraste de pelo menos 4,5:1.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B36-01 | Só existem duas opções de tema, Claro e Escuro, sem "automático pelo sistema" | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-08 | A logo escura usada é `Logo crmatacado exp em grafite1.png` (horizontal, fundo transparente), da pasta Downloads da Marcelle | confirmada | Marcelle, 21/10/2026 |
| SUP-B36-09 | O favicon (o "exp" sobre fundo escuro) não muda | confirmada | Marcelle, 21/10/2026 |

## Perguntas em aberto

| ID | Pergunta | Status | Resposta |
|---|---|---|---|
| PER-B36-02 | Onde fica guardada a escolha de tema? | respondida | No perfil do usuário (Marcelle, 21/10/2026) |
| PER-B36-03 | Onde a pessoa troca o tema? | respondida | No menu do usuário (Marcelle, 21/10/2026) |
| PER-B36-04 | Como ficam login, cadastro, páginas legais e loja pública? | respondida | Login, cadastro e legais no claro; a loja só no claro, com o visual de hoje (Marcelle, 21/10/2026) |
| PER-B36-07 | De onde vem a logo escura? | respondida | A Marcelle já tem o arquivo (21/10/2026); ver SUP-B36-08 |
