// O anexo da campanha é sempre um arquivo enviado pela própria empresa, pela tela da
// campanha (B44-06). Conferido na tela, ao salvar, e de novo no envio (B47-01), porque
// Admin e Gerente conseguem gravar a campanha direto no banco, sem passar pela tela.

/**
 * O endereço vai para o canal buscar; um endereço qualquer faria o gateway buscar o
 * que quem gravou quisesse. Só passa o arquivo da pasta de campanhas da empresa.
 */
export function anexoDaEmpresa(arquivoUrl: string, workspaceId: string): boolean {
  const pasta = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chat-attachments/${workspaceId}/campanhas/`
  let endereco: URL
  try {
    endereco = new URL(arquivoUrl)
  } catch {
    return false
  }
  return endereco.href === arquivoUrl && arquivoUrl.startsWith(pasta) && /^[A-Za-z0-9._-]+$/.test(arquivoUrl.slice(pasta.length))
}
