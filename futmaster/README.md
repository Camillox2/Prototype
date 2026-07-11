# FutMaster 3.3

Manager de futebol masculino para **Web/PWA**, **Android** e multiplayer opcional. O singleplayer funciona integralmente offline; somente o multiplayer utiliza um servidor Node/WebSocket separado.

## Destaques da 3.3

- **Partida 2D Pro:** 22 jogadores, nomes, bola, passes, conduções, chutes, defesas, rebotes, escanteios, comemorações, trajetórias, três câmeras e velocidades de 0,5× a 8×;
- **premiações ilustradas:** 16 artes originais no jogo, sem copiar troféus oficiais; a build privada usa PNGs;
- **automação avançada:** análise do adversário, rotação por físico, contratos, carências por posição, mercado, base, proteção financeira e planejamento plurianual;
- **somente futebol masculino:** módulos femininos antigos são neutralizados e não geram partidas, custos ou evolução;
- **Android:** versão e identidade visual aplicadas automaticamente durante `android:prepare`.

## Singleplayer offline

O singleplayer não requer conta, backend ou internet. Saves, partidas, clubes e configurações ficam no aparelho usando armazenamento local/IndexedDB. Modos: manager completo, treinador, diretor de futebol, presidente, proprietário e começar sem clube.

## Multiplayer

O multiplayer é opcional e requer o servidor WebSocket:

- clubes diferentes na mesma liga;
- clubes de ligas diferentes no mesmo universo;
- gestão compartilhada do mesmo clube;
- permissões por setor, chat, reconexão e confirmação de rodada;
- save isolado por sala, sem sobrescrever a carreira offline.

```bash
npm install
npm run multiplayer:server
```

Padrão: `ws://localhost:8787`. Pela internet, use hospedagem compatível com WebSocket e `wss://`.

## Premiações masculinas

Bola de Ouro, The Best, Chuteira de Ouro, Puskás, Yashin, Kopa, Gerd Müller, Sócrates, Johan Cruyff, Golden Boy, Laureus, IFFHS, Onze d’Or, Globe Soccer, Melhor Jogador da Europa, Rei da América, prêmios continentais, nacionais, de Copa do Mundo e seleção mundial do ano, com finalistas, pontuação e histórico.

## Sistemas

Táticas A/B/C, funções, bolas paradas, treino, medicina, mercado, empréstimos, parcelas, scouting, agentes, ligas, copas, seleções, Mundial, multiclubes, imprensa, rede social, vestiário, torcida, estádio, finanças, governança, uniformes, patrocinadores, avatares, editor, desafios, conquistas e automação manual/assistida/total.

## Conteúdo local

Pacotes `*.fmpack.json` podem importar clubes, atletas e escudos autorizados. Catálogos grandes ficam no IndexedDB; apenas a liga ou clube escolhido entra no save principal.

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

## APK Android

Requer Java 21 e Android SDK:

```bash
npm install
npm run verify
npm run android:prepare
cd android
./gradlew assembleDebug
```

Saída: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Testes e segurança

`npm run verify` valida sintaxe, motor de partidas, lançamento, premiações, carreira offline, protocolo multiplayer, dois clientes WebSocket reais, hardening e recursos 3.3. O jogo mantém checkpoints, restauração, reparo de IDs/elencos/base/finanças, namespaces separados e diagnóstico local.

## Direitos

O repositório público contém código, identidade e artes originais do FutMaster. Dados, nomes, marcas, fotos e escudos de terceiros devem ser usados somente com autorização adequada; os pacotes privados permanecem fora do Git.
