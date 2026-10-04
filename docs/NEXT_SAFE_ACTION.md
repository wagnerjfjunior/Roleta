# Roleta — Next Safe Action

## RLT-M3-05

1. Resolver `main` ao vivo e confirmar `.sfjm/project.json`.
2. Receber as duas folhas/resultados de 04/10/2026 separadamente:
   - manhã;
   - tarde.
3. Registrar cada roleta de 04/10 como evento próprio; não criar evento `integral` para esta data.
4. Adjudicar HIT/MISS apenas contra escolhas congeladas prospectivamente, sem hindsight.
5. Não recalcular retroativamente escolhas depois de conhecer o resultado.
6. Reconciliar presença de Sabrina/Brenda e Laura de 28/09 a 02/10 pelas fontes originais.
7. Não usar overrides antigos como fonte primária.
8. Continuar validação prospectiva Champion vs Challengers.
9. Para 25/10/2026, aplicar a mesma exceção manhã+tarde somente se houver 2º turno.

### Regra de calendário
- segunda a sexta: manhã + tarde;
- sábado e domingo: uma roleta integral por dia;
- exceções eleitorais:
  - 04/10/2026: manhã + tarde;
  - 25/10/2026: manhã + tarde, se houver 2º turno.

### Delivery
- branch dedicada para mudanças;
- validação local via LVR;
- mesma branch para correções;
- merge e produção somente após autorização explícita;
- não usar patch manual como mecanismo padrão;
- NO PREVIEW / NO REMOTE ITERATION.

### Bloqueios
NO NAME INFERENCE; NO COMPLEMENT INFERENCE; NO POSITION COLLAPSE; NO PREDICTIVE CLAIM; NO HINDSIGHT CREDIT; NO PREVIEW; NO REMOTE ITERATION; NO IMPLICIT PUSH/DEPLOY; NO TRUST IN DISPUTED PRESENCE OVERRIDES.
