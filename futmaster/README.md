# FutMaster 3.2

Manager de futebol masculino para **Web/PWA**, **Android** e multiplayer opcional. O singleplayer funciona integralmente offline; o multiplayer utiliza um servidor Node/WebSocket separado.

## Modos de jogo

### Singleplayer offline

- manager completo;
- treinador;
- diretor de futebol;
- presidente;
- proprietário;
- começar sem clube;
- demissão, candidaturas, propostas, aposentadoria e carreira pós-campo.

### Multiplayer

- clubes diferentes na mesma liga;
- clubes de ligas diferentes no mesmo universo;
- gestão compartilhada do mesmo clube;
- permissões por setor, chat, reconexão, escolha de clube e confirmação de rodada;
- save isolado por sala, sem sobrescrever a carreira offline.

## Sistemas

- partidas minuto a minuto e visualização 2D com 22 jogadores;
- táticas A/B/C, funções, bolas paradas, treino e medicina;
- mercado, empréstimos, parcelas, scouting e agentes;
- ligas, copas, seleções, Mundial e grupo multiclubes;
- imprensa, rede social, vestiário, torcida, estádio, finanças e governança;
- uniformes, patrocinadores, avatares e mídia;
- criação de clube/jogador, editor, desafios e conquistas;
- automação manual, assistida ou total por departamento;
- somente futebol masculino.

## Premiações masculinas

Bola de Ouro, The Best, Chuteira de Ouro, Puskás, Yashin, Kopa, Gerd Müller, Sócrates, Johan Cruyff, Golden Boy, Laureus, IFFHS, Onze d’Or, Globe Soccer, Melhor Jogador da Europa, Rei da América, prêmios continentais, nacionais, de Copa do Mundo e seleção mundial do ano. Há finalistas, pontuação e histórico por temporada.

## Segurança de save e diagnóstico

- três slots e backups JSON;
- namespace separado para cada sala multiplayer;
- checkpoint antes de avançar;
- restauração de emergência;
- validação e reparo de IDs, elencos, base, finanças e histórico;
- captura local de erros;
- tela de diagnóstico e estimativa de armazenamento.

## Conteúdo local

Pacotes `*.fmpack.json` podem importar clubes, atletas e escudos autorizados. Catálogos grandes ficam no IndexedDB, enquanto apenas a liga ou clube escolhido entra no save principal.

```bash
pip install javaobj-py3 libarchive-c
python tools/import_brasfoot_pack.py "/caminho/do/patch" generated-packs
```

## Web/PWA

```bash
npm install
npm run verify
npm run serve
```

Abra `http://localhost:8080`.

## Servidor multiplayer

```bash
npm install
npm run multiplayer:server
```

Padrão: `ws://localhost:8787`. Para uso pela internet, hospede o processo em serviço compatível com WebSocket e utilize `wss://`.

## Android APK

Requer Java 21 e Android SDK:

```bash
npm install
npm run verify
npm run android:prepare
cd android
./gradlew assembleDebug
```

Saída:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Testes

`npm run verify` executa validação de sintaxe, motor de partidas, lançamento, premiações, carreira offline, protocolo multiplayer, dois clientes WebSocket reais e hardening final.

## Direitos

O repositório público contém código e conteúdo fictício. Dados, nomes, marcas, fotos e escudos de terceiros devem ser usados somente com autorização adequada; os pacotes privados permanecem fora do Git.
