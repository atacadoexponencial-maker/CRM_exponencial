// B46 — aplica as migrations que faltam no banco de teste, e só nele.
// Uso: npm run db:teste:push            (migrations de supabase/migrations)
//      node supabase/banco-de-teste/aplicar-migrations.mjs --workdir <pasta>
//        (pasta que contém um supabase/migrations próprio; usada pelos testes)
import { enderecoDoBanco, lerEnvTeste, rodarSupabase } from "./comum.mjs"

let env
try {
  env = lerEnvTeste()
} catch (e) {
  console.error(`Banco de teste: ${e.message}`)
  process.exit(1)
}

const argumentos = ["db", "push", "--db-url", enderecoDoBanco(env), "--yes"]
const i = process.argv.indexOf("--workdir")
if (i !== -1 && process.argv[i + 1]) argumentos.push("--workdir", process.argv[i + 1])

const r = rodarSupabase(argumentos, { stdio: "inherit" })
process.exit(r.status ?? 1)
