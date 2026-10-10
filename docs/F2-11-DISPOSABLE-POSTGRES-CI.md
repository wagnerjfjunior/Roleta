# F2-11 — PostgreSQL descartável no CI

Workflow `.github/workflows/f2-11-postgres-disposable.yml` sobe PostgreSQL 16 isolado no GitHub Actions. O banco `roleta_ci` é criado pelo container temporário, sem qualquer credencial Supabase.

Executa os dois arquivos de `database/review-only` **somente dentro do container descartável**, após conferir o nome do banco. Verifica RLS/FORCE RLS, schema sem USAGE e função sem EXECUTE para `anon`, `authenticated` e `roleta_runtime`, e nega privilégios de tabela.

O teste não comprova segurança do SQL de append: **a função não é executada**, pois não possui grants e ainda não atende aos critérios de integridade. O objetivo é validar sintaxe/DDL e isolamento negativo. A etapa seguinte exigirá função de append final, vetores de hash interoperáveis e testes de transação/concorrência reais.

Não há alterações, migrações, credenciais ou conexões ao Discador-MesaCliente.
