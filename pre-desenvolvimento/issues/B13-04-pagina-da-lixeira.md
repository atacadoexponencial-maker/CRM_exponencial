# B13-04: Lixeira — ver, restaurar e apagar de vez

**Tipo:** Implementação
**Página:** Lixeira (`/contatos/lixeira`), Contatos (link e perfil)
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-lixeira-contatos.md`

## Descrição

Implementar a página da Lixeira do protótipo com dados reais: cada usuário vê o que
veria fora dela (atendente: os dele), com quem excluiu, quando e "apaga em N dias".
Restaurar devolve contato, cards (mesmos funis e etapas), conversas, mensagens e
lembretes pendentes — e recusa, com explicação, se já houver outro contato ativo com o
mesmo telefone. Apagar de vez, com confirmação, remove para sempre contato, cards,
histórico, notas, conversas, mensagens e os arquivos de mídia. Link "Lixeira (N)" na
lista de contatos; perfil de contato na lixeira mostra o aviso com "Restaurar"; perfil
de contato apagado de vez mostra "Contato não encontrado".

Depende de B13-03 (restaurar volta a contar no dashboard, agenda etc.).

## Pronto quando

No CRM publicado, a Marcelle abre a Lixeira, restaura "Teste Cliente" e ele volta ao
funil e a Contatos; exclui de novo e usa "Apagar de vez", e ele some do banco junto com
cards e conversas; e um atendente só vê na lixeira os contatos que eram dele.
