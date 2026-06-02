import { createServiceClient } from "@/integrations/supabase/service"

export default async function StatusExclusaoDados({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = createServiceClient()

  const { data } = await supabase
    .from("data_deletion_requests")
    .select("status, created_at")
    .eq("confirmation_code", code)
    .maybeSingle()

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-semibold mb-4">Exclusão de dados</h1>

        {!data ? (
          <p className="text-muted-foreground">Código de confirmação não encontrado.</p>
        ) : (
          <div className="rounded-lg border p-6 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Código de confirmação</p>
            <p className="font-mono text-sm break-all">{code}</p>

            <div className="h-px bg-border" />

            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">
              {data.status === "pending" && "Solicitação recebida — em processamento"}
              {data.status === "completed" && "Dados excluídos"}
              {data.status !== "pending" && data.status !== "completed" && data.status}
            </p>

            <p className="text-xs text-muted-foreground">
              Solicitado em{" "}
              {new Date(data.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
