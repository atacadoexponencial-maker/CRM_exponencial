// B21-05: o número de teste da Meta é um só, compartilhado entre todas as empresas.
// Só aparece (e só conecta) onde a variável o libera — em produção fica desligado.
export function numeroTesteHabilitado(): boolean {
  return process.env.HABILITAR_NUMERO_TESTE_META === "1"
}
