# FutMaster Multiplayer 3.1

O singleplayer continua 100% offline. Este servidor é utilizado somente quando o jogador escolhe **Multiplayer**.

## Modos

- `same-league`: cada amigo controla um clube diferente da mesma liga;
- `multi-league`: clubes de ligas diferentes compartilham o universo e podem se encontrar em copas;
- `shared-club`: várias pessoas administram o mesmo clube, com permissões por setor.

## Executar

```bash
npm install
npm run multiplayer:server
```

Servidor padrão: `ws://localhost:8787`. Em produção, utilize HTTPS/WSS e configure um proxy reverso.

## Variáveis

- `PORT`: porta HTTP/WebSocket;
- `HOST`: endereço de bind;
- `FUTMASTER_ROOMS_FILE`: arquivo JSON de persistência;
- `FUTMASTER_MAX_PAYLOAD`: tamanho máximo da mensagem;
- `FUTMASTER_ORIGINS`: origens permitidas separadas por vírgula.

## Segurança e sincronização

- senhas são armazenadas como hash SHA-256;
- reconexão usa token aleatório por membro;
- toda publicação exige a revisão atual da sala;
- objetos recebidos ignoram chaves de poluição de protótipo;
- o host controla permissões no clube compartilhado;
- payload e quantidade de ações são limitados;
- salas são persistidas em JSON com gravação atômica.

A sincronização é autoritativa no servidor, mas a simulação da rodada ocorre no cliente do host. Quando todos marcam **pronto**, o host avança o universo e publica o novo estado.

## Docker

```bash
docker build -f multiplayer/Dockerfile -t futmaster-multiplayer .
docker run -p 8787:8787 -v "$PWD/multiplayer-data:/app/multiplayer/data" futmaster-multiplayer
```

O servidor pode ser hospedado em qualquer plataforma que suporte processos Node persistentes e WebSocket. O multiplayer não funciona somente com arquivos estáticos; o singleplayer funciona normalmente sem o servidor.
