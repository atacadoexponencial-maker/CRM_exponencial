# B47-02: Tempo real e foto do contato presos à empresa

**Tipo:** Implementação
**Página:** Tempo real do chat / Foto do contato
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-5.md`

## Descrição

Fechar o canal pessoal de tempo real para conta desativada, tirar o aviso de foto nova
que ia para a empresa inteira e assinar só o caminho da foto do próprio contato.

## Pronto quando

Conta desativada não ouve o próprio canal, a foto nova não é transmitida para a empresa e
um caminho de foto adulterado não vira link, enquanto a foto certa continua aparecendo.

## Critérios de aceite

- **CA-B47-05** (automática) — conta desativada não ouve o canal pessoal. Dado um atendente com a conta desativada e o acesso ainda válido, quando ele tenta entrar no próprio canal de tempo real, então a entrada é recusada, e com a conta ativa ela continua aceita.
- **CA-B47-06** (automática) — foto nova do contato não é transmitida para a empresa. Dado um contato cuja foto de perfil acabou de ser guardada, quando a guarda termina, então nada é transmitido em tempo real com a foto, e a foto aparece para quem vê o contato no próximo carregamento da lista do chat e do perfil.
- **CA-B47-07** (automática) — caminho de foto de outra empresa não vira link. Dado um contato cujo caminho da foto foi trocado direto no banco para a foto de um contato de outra empresa, quando o perfil do contato e a lista do chat pedem a foto, então nenhuma foto aparece para ele, e a foto de um contato sem adulteração continua aparecendo.

## Suposições

| ID | Suposição | Status | Resolução |
|---|---|---|---|
| SUP-B47-02 | O aviso de foto nova segue a mesma regra de canais das mensagens novas (gestão, responsável, fila aberta) | invalidada | O aviso sai (Marcelle, 28/10/2026) |

## Perguntas em aberto

Nenhuma.

## Cenários

### Happy Path
1. **Canal pessoal:** a política "Gestão e responsável ouvem as mensagens novas" (`realtime.messages`) é recriada com a conferência de conta ativa no canal `usuario:<id>`, como já fazem o canal da empresa e o da fila aberta.
2. **Aviso de foto:** `buscarEGuardarFotoDoContato` deixa de transmitir `contato_foto`; `transmitirContatoFoto` e o ouvinte do chat (`chat-layout.tsx`) saem. A foto continua guardada em `contacts.photo_path`, e a lista do chat e o perfil a mostram no próximo carregamento.
3. **Link da foto:** `urlAssinadaDaFoto` e `urlsAssinadasDasFotos` passam a receber a empresa e o contato, e só assinam o caminho `caminhoDaFoto(empresa, contato)`. A lista do chat e o perfil do contato passam a empresa e o contato de cada linha.

### Edge Cases
- **Conta reativada:** volta a ouvir o canal pessoal.
- **Contato sem foto:** sem link, como hoje.
- **Caminho gravado de outro contato da mesma empresa:** também não vira link; só vale o caminho do próprio contato.

### Cenário de Erro
- Falha ao assinar continua dando "sem foto", sem derrubar a tela.

## Prova

| Critério | Prova | Onde | O que confere |
|---|---|---|---|
| CA-B47-05 | automática | `src/test/tempo-real-e-foto-presos-a-empresa.integration.test.ts` | no banco de teste, um atendente ativo entra no próprio canal privado; desativado, com o mesmo acesso, a entrada é recusada |
| CA-B47-06 | automática | `src/test/foto-de-perfil-contato.test.ts` | ao guardar a foto, nada é transmitido em tempo real (nenhuma chamada ao broadcast) e o caminho guardado é o do próprio contato, que o próximo carregamento assina |
| CA-B47-07 | automática | `src/test/tempo-real-e-foto-presos-a-empresa.integration.test.ts` | no banco de teste, com uma foto guardada para o contato de outra empresa, as duas funções de link não assinam esse caminho para outro contato e assinam a foto do próprio contato, que abre |

## Banco de Dados

- Migration nova `supabase/migrations/20261028000001_canal_pessoal_so_conta_ativa.sql`: recria a política do canal pessoal com conta ativa. **Primeira migration depois da B46:** vai primeiro ao banco de teste (`npm run db:teste:push`), roda os testes, e só depois à produção (CA-B46-15).

## Arquivos

- **Criar:** `supabase/migrations/20261028000001_canal_pessoal_so_conta_ativa.sql` — conta desativada fora do canal pessoal
- **Modificar:** `src/lib/whatsapp/foto-de-perfil.ts` — sem aviso de foto; links só do caminho do próprio contato
- **Modificar:** `src/lib/whatsapp/realtime.ts` — sai `transmitirContatoFoto`
- **Modificar:** `src/app/(auth)/chat/components/chat-layout.tsx` — sai o ouvinte de `contato_foto`
- **Modificar:** `src/app/(auth)/chat/conversas.ts` — pede o link com a empresa e o contato
- **Modificar:** `src/app/(auth)/contatos/actions.ts` — pede o link com a empresa e o contato
- **Modificar:** `src/test/foto-de-perfil-contato.test.ts` — teste do CA-B47-06; os testes da B29 deixam de esperar o aviso
- **Modificar:** `src/test/foto-de-perfil-seguranca.integration.test.ts` — o link da foto agora recebe a empresa e o contato
- **Apagar:** `src/test/foto-ao-vivo.test.tsx` — testava o aviso que sai (CA-B29-17)
- **Criar:** `src/test/tempo-real-e-foto-presos-a-empresa.integration.test.ts` — testes do CA-B47-05 e do CA-B47-07

## Checklist

- [x] Escrever a migration e aplicar no banco de teste
- [x] Tirar o aviso de foto (servidor, tela e teste antigo)
- [x] Assinar só o caminho da foto do próprio contato
- [x] Rodar os testes de foto, de chat e de contatos (lição L-05)
- [x] Rodar o `tsc` no projeto inteiro
