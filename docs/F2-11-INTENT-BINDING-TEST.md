# F2-11 — Vínculo de intenção canônica

Os vetores de teste são produzidos pela implementação JS `prepareEvidenceIntent`. O PostgreSQL descartável verifica (1) SHA-256 dos bytes exatos, (2) documento JSON com exatamente cinco campos e (3) igualdade semântica com os campos tipados de evento, tipo, política, idempotência e payload. Rejeita alteração de digest, evento, chave ou payload.

Esta é uma prova de conceito de verificação na fronteira, não um RPC implantável. A comparação `jsonb` não prova que a serialização foi canônica; um cliente malicioso pode fornecer outra serialização equivalente com SHA próprio. O servidor deve canonicalizar de novo ou exigir bytes de uma origem confiável, e o banco deve verificar actor e timestamp. Ainda faltam função transacional definitiva, isolamento efetivo do papel e testes concorrentes SQL.

Nunca executar em Supabase de produção sem autorização de migração específica.
