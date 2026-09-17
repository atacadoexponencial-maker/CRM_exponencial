# B2-01: Protótipo — Conexão de número e escolha de canal

**Tipo:** Protótipo
**Módulo:** B2 — Conexão de Número por QR Code
**Repositório:** `CRM_exponencial`

## Contexto

Hoje `/configuracoes/whatsapp` só sabe conectar número pela API Oficial da Meta: a página mostra **um** cartão de número conectado ou o wizard do Embedded Signup. Está entrando um segundo canal — um gateway próprio, conectado por leitura de QR Code — e os dois vão coexistir por número, no mesmo workspace. Esta issue entrega **só as telas**, com dados fixos no arquivo, para a forma ser aprovada antes de qualquer chamada real ao gateway.

## O que construir

As telas do fluxo de conexão pelo canal direto, sem backend nenhum. Tudo com dados fixos escritos no próprio arquivo — nenhuma chamada ao gateway, nenhuma leitura de banco além da que a página já faz hoje.

1. **Escolha de canal** — antes de conectar, o admin escolhe entre "API Oficial" e "canal direto", com uma explicação curta de cada um: o que é, em quanto tempo conecta, e o risco de cada escolha.
2. **Tela de QR Code** — área do código, instruções de leitura no aparelho, contador de expiração e ação de gerar novo código.
3. **Alternativa por código** — campo de número e exibição do código de pareamento, como caminho alternativo ao QR.
4. **Indicador de estado** — os estados do pareamento, visualmente distintos: aguardando leitura, conectando, conectado, falhou.
5. **Cartão do número conectado** — número, nome de exibição, canal e estado.
6. **Lista de números** — vários números no mesmo workspace, cada um com o seu canal visível.
7. **Avisos** — motivo da falha quando a conexão não completa, e aviso destacado para número banido.

## Comportamentos da spec cobertos

Nenhum. Esta é uma issue de protótipo: entrega a casca visual, e os comportamentos são implementados nas issues B2-02 a B2-05. Os **componentes** da spec entregues aqui são:

- [ ] Escolha de Canal: seleção entre API Oficial e canal direto, com explicação de cada um
- [ ] Tela de QR Code: código exibido para leitura, com instruções e contador de expiração
- [ ] Alternativa por Código: campo para gerar código de pareamento por número
- [ ] Indicador de Estado: aguardando leitura, conectando, conectado ou falhou
- [ ] Cartão do Número Conectado: número, nome de exibição, canal e estado

## Contrato do gateway

Nenhum endpoint é chamado nesta issue. Os dados fixos devem, ainda assim, **ter a forma do contrato** (`whatsapp-gateway/pre-desenvolvimento/contrato-v1.md`), para as issues seguintes só trocarem a origem do dado:

- Estado de instância, os seis valores de `instance.state`: `pairing`, `connecting`, `connected`, `disconnected`, `banned`, `removed`
- Motivo de transição não solicitada, valores de `reason`: `session_closed_on_device`, `banned_by_whatsapp`, `connection_lost`
- Pareamento: `{ qr, expires_at }` e `{ pairing_code, expires_at }` — `qr` é o **conteúdo bruto** do código, não uma imagem; quem desenha é o CRM

## Arquivos

- **Modificar:** `src/app/(auth)/configuracoes/whatsapp/page.tsx` — hoje decide entre cartão único e wizard; passa a listar números e a oferecer a escolha de canal. A verificação de admin (`perfil?.role !== "admin"` → `redirect("/perfil")`) fica como está.
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/escolha-canal.tsx` — seleção entre os dois canais, com as explicações
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/tela-qr-code.tsx` — código, instruções, contador e ação de renovar
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/pareamento-por-codigo.tsx` — campo de número e exibição do código
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/cartao-numero.tsx` — cartão de um número, com canal, estado e avisos
- **Criar:** `src/app/(auth)/configuracoes/whatsapp/canal-direto/lista-numeros.tsx` — vários números, cada um com o seu canal

Reaproveitar, não recriar:

- `Badge` (`src/components/ui/badge.tsx`) — já usado para o status em `page.tsx`, com o par de cores verde/cinza; os estados novos seguem o mesmo padrão
- `Button` (`src/components/ui/button.tsx`), `Dialog` (`src/components/ui/dialog.tsx`), `Input` e `Label` — únicos primitivos disponíveis; a UI é Base UI, **não** Radix
- `acoes-whatsapp.tsx` — padrão de diálogo de confirmação com `useState` por ação, a ser seguido em B2-05
- `wizard-conexao.tsx` — referência de layout do fluxo de conexão atual; **não alterar** nesta issue
- Ícones: `lucide-react`

## Depende de

Nada. É a primeira issue do módulo.

## Critérios de aceite

- [ ] `/configuracoes/whatsapp` mostra a escolha de canal antes de iniciar uma conexão
- [ ] A tela de QR Code aparece com código, instruções, contador e ação de renovar
- [ ] O caminho por código digitado aparece como alternativa ao QR
- [ ] Os quatro estados do pareamento são visualmente distintos
- [ ] A lista mostra mais de um número, com o canal de cada um visível
- [ ] Um número banido aparece com aviso destacado, diferente do estado desconectado
- [ ] Uma falha de conexão aparece com o motivo legível
- [ ] A página continua sendo só de Admin
- [ ] `npm run build` e `npm run lint` passam

## Fora de escopo

- Qualquer chamada ao gateway, e qualquer credencial dele
- Migration, coluna nova ou escrita em banco
- Mexer em `wizard-conexao.tsx`, `actions.ts` ou no fluxo da Meta
- O `config_id` do Embedded Signup aponta para um app da Meta apagado (achado registrado em `pre-desenvolvimento/decisoes/B1-01-camada-de-provider.md`, seção 8.2). **Não é desta issue.**
- Envio de mensagem pelo canal direto — é a issue do provider do gateway
