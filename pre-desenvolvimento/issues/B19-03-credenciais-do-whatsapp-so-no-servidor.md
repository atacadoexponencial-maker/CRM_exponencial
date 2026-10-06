# B19-03: Credenciais do WhatsApp só no servidor

**Tipo:** Implementação
**Página:** Chat, Templates, Conexão do WhatsApp (e saúde/ritmo), Campanhas
**Repositório:** `crm-exponencial`
**Spec:** `pre-desenvolvimento/spec-seguranca-rodada-1.md` — módulo 4

## Descrição

Fechar a falha que deixa qualquer membro da empresa ler pelo navegador as credenciais
dos números (API Oficial e canal direto). O banco deixa de entregar essas colunas a
qualquer usuário, e todo ponto do sistema que hoje as lê com a permissão do usuário
passa a lê-las pelo servidor, só depois de confirmar que o número é da empresa de quem
pediu.

## Pronto quando

Mandar mensagem no chat (texto e mídia, nos dois canais), abrir e criar templates,
reinscrever o webhook, ver saúde e ritmo, conectar/desconectar/reconectar, listar os
números e disparar campanha e sequência continuam funcionando; e testes automatizados
provam que um usuário logado de qualquer papel que peça as colunas de credencial é
recusado pelo banco, e que pedir ação com o número de outra empresa não lê a credencial
dela. A permissão foi conferida no Supabase de produção, não só no arquivo da mudança.
