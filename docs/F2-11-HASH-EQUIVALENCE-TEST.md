# F2-11 — Teste de equivalência SHA-256 JS ↔ PostgreSQL

O CI gera vetores com `simulation/prospective-intent.cjs::canonical` em JavaScript e calcula SHA-256. O PostgreSQL 16 descartável usa `extensions.digest(convert_to(canonical_bytes,'UTF8'),'sha256')` e compara os valores. Os vetores incluem Unicode, números, objetos aninhados, caracteres escapados, envelope e intenção.

**Escopo exato:** comprova equivalência de digest **sobre os mesmos bytes canônicos UTF-8**. Não comprova que `jsonb::text` produz os mesmos bytes; não produz garantia de equivalência do protótipo de append SQL atual. O protótipo continua bloqueado para produção.

A arquitetura final deve transportar bytes canônicos de uma fronteira autenticada e vinculá-los aos campos validados, ou implementar canonicalização SQL rigorosamente equivalente com vetores adversariais. O banco deve verificar o digest, identidade, timestamp e encadeamento dentro da transação. Nenhum hash fornecido pelo cliente pode ser aceito sem verificação.

O CI utiliza exclusivamente o banco temporário `roleta_ci`. Nenhuma conexão com Supabase.
