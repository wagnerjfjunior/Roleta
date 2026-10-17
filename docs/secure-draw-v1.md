# Sorteador Seguro V1 — implantação controlada

## Situação
Implementado apenas na branch de desenvolvimento. Não fazer merge ou promover a produção sem banco Neon isolado, credenciais protegidas e testes de homologação. O sorteador local /sorteador/ permanece independente.

## Componentes
- `/sorteador/oficial/`: interface para operadores, sem segredo persistido pelo JavaScript.
- `/api/secure-draw`: Vercel Function Node.js: GET de estado/histórico, POST de início/retirada/verificação de comprovante.
- `server/secure-draw-core.cjs`: Node crypto.randomInt (sem viés) e assinaturas Ed25519.
- `db/secure-draw-neon.sql`: duas tabelas próprias de sessões e eventos.
- `tests/secure-draw.test.cjs`: limites, não repetição, autenticação, assinaturas e alterações detectadas.

## Provisionamento necessário, sem Supabase
1. Criar um projeto Neon separado **exclusivamente** para os sorteios. Confirmar cotas do plano gratuito e condições de uso.
2. Aplicar `db/secure-draw-neon.sql` com administrador do banco.
3. Criar uma role da API com permissões mínimas; evitar conexão com usuário proprietário das tabelas. Conceder SELECT/INSERT em tabelas, USAGE/SELECT na sequência de eventos, e UPDATE apenas de `last_hash,finished_at` nas sessões. Configurar a URL de conexão dessa role em `SORTEADOR_DATABASE_DATABASE_URL`.
4. Gerar par Ed25519 fora do repositório. Guardar **somente** a chave privada PKCS#8 PEM em `SORTEADOR_ED25519_PRIVATE_KEY`, como variável secreta da Vercel; pode conter quebras de linha reais ou literais `\\n`. A chave pública é derivada no servidor.
5. Gerar uma chave aleatória diferente, com 32+ bytes criptográficos, por operador; guardar no ambiente como JSON em `SORTEADOR_OPERATOR_KEYS_JSON`. Formato ilustrativo `{"operador1":"<token_de_64_hex>","operador2":"<outro_token>"}`. **Não inserir valores reais no GitHub, no chat ou em páginas públicas.**
6. Não ativar rota, divulgar chaves ou habilitar operadores antes de validar permissões, autoria, isolamento e comportamento de erro na Vercel.
7. Para homologar, iniciar uma sessão de 3 números; conferir estado, dupla requisição com o mesmo UUID, concorrência, reconexão, sequência completa e assinatura; repetir com o modo de intervalo.

## Contrato de acesso
- `GET /api/secure-draw?sessionId=<uuid>` — Bearer por operador, consulta estado com verificação da cadeia.
- `GET /api/secure-draw?list=1` — Bearer, até 100 sessões recentes do operador.
- `POST /api/secure-draw` `{"action":"start","requestId":"<uuid>","mode":"count","total":25}`
- `POST /api/secure-draw` `{"action":"start","requestId":"<uuid>","mode":"range","first":50,"last":80}`
- `POST /api/secure-draw` `{"action":"draw","sessionId":"<uuid>","requestId":"<uuid>"}`
- `POST /api/secure-draw` `{"action":"verify","receipt":{"payload":{...},"signature":"..."}}` — verifica assinatura de **um recibo**, não comprova isoladamente a completude da sessão.

## Garantias e limites honestos
- O cliente **não determina** nem antecipa os números. O servidor usa `crypto.randomInt()` e transações de linha bloqueada com unicidade e idempotência.
- Um token autoriza **um** operador; a identidade é tão forte quanto a guarda individual desse segredo, não é autenticação multifator.
- A cadeia assinada detecta alterações em eventos consultados, mas administrador do banco pode apagar registros ou sessões. Sem ancoragem independente, **não há comprovação absoluta de ausência de exclusões**.
- Um operador pode iniciar outras sessões; ficam no histórico da sua conta. O sistema ainda não implementa fiscalização externa de todas as sessões.
- Não há backup avançado nem SLA de alta disponibilidade no escopo aprovado. Falhas de banco/rede devem bloquear operações, nunca gerar números locais como substitutos.
- Arquitetura correta depende de role SQL restrita, segredo privado protegidos, configurações seguras de deploy e testes efetivos. Só passar em testes unitários não significa aprovação de segurança.
- Para operação comercial, respeitar os termos de uso do plano Vercel contratado; Hobby não substitui plano comercial.
