# FutMaster 1.0

Manager de futebol original para **Web/PWA** e **Android APK**, com funcionamento totalmente local. A mesma carreira reúne clube, seleção, grupo multiclubes, mercado, ligas, torcida, infraestrutura, tática, treinamento, medicina, criação de conteúdo e automação.

## Modos de controle

- manual;
- assistido por departamento;
- automático geral.

Setores delegáveis: futebol, base, scouting, médico, comercial, relacionamento com sócios e torcida, estádio e finanças. Seleções de base, futebol feminino e clubes adquiridos também podem operar automaticamente. A rede social gera publicações sozinha e pode responder críticas automaticamente quando relacionamento/comercial estiver delegado.

## Principais sistemas

- motor de partidas minuto a minuto, com overall por posição, moral, forma, físico, entrosamento, tática, mando, clima, árbitros, VAR, cartões, lesões, substituições, xG e zebras controladas;
- planos táticos A/B/C, funções individuais e bolas paradas;
- treino semanal por sessões e evolução/regressão de atletas;
- medicina avançada, cirurgia, recaída e atuação no sacrifício;
- mercado vivo entre clubes, agentes, parcelas, empréstimos e pré-contratos;
- scouting regional com conhecimento parcial e atributos ocultos;
- carreira profissional do treinador, reputação, licenças e troca de clube;
- vinte divisões simuladas em seis países, promoções, rebaixamentos, coeficientes e calendário de 48 semanas;
- clube e seleção simultaneamente, Mundial, Sub-17, Sub-20 e Olímpica;
- grupo multiclubes, empréstimos internos e controle manual ou automático;
- imprensa, vestiário, rivalidades, clima, punições e governança;
- estádio, torcida, sócios, patrocinadores, obras e futebol feminino;
- saves em três slots, checkpoints, diagnóstico, compactação e testes de balanceamento;
- criação de clube e jogador, desafios, conquistas, tutorial, pesquisa e comparação;
- rede social fictícia com torcedores, jornalistas, críticos e ex-jogadores;
- tema claro/escuro, fonte, densidade, alto contraste e redução de movimento.

## Conteúdo privado do patch Brasfoot

Os clubes, atletas e escudos fornecidos pelo usuário **não são publicados no GitHub**. Eles são convertidos em pacotes locais por país e armazenados no IndexedDB do aparelho.

Conversor:

```bash
pip install javaobj-py3 libarchive-c
python tools/import_brasfoot_pack.py "/caminho/Superpatch Brasfoot 2024 M" generated-packs
```

O conversor gera arquivos `*.fmpack.json`. No jogo, abra **Conteúdo local**, importe um país e escolha:

- assumir um clube;
- criar uma liga com os dez clubes mais fortes do pacote.

Somente a liga ou clube escolhido entra no save principal. O catálogo completo e os escudos permanecem no armazenamento privado do dispositivo.

## Armazenamento

- `localStorage` para a carreira e os módulos;
- IndexedDB para catálogos privados grandes;
- PWA offline;
- backup completo em JSON;
- sem conta, backend, banco externo ou multiplayer.

## Arquitetura

- `www/core.js`: jogadores, clubes e overalls;
- `www/match-engine.js`: partidas;
- `www/systems.js`: administração e automação;
- `www/career-v04.js`: contratos, competições e governança;
- `www/international-v04.js`: seleções e multiclubes;
- `www/universe-v05.js`: universo, imprensa, clima, punições e legado;
- `www/match2d-v05.js`: reconstrução visual 2D;
- `www/stability-v06.js`: saves e diagnóstico;
- `www/career-market-v07.js`: mercado, scouting e carreira;
- `www/world-pyramid-v08.js`: divisões, calendário e regulamentos;
- `www/football-depth-v09.js`: tática, treino, medicina e desenvolvimento;
- `www/release-core-v10.js` e `www/release-ui-v10.js`: criação, mods, desafios, tutorial e acessibilidade;
- `www/social-local-v10.js`: rede social e importação privada.

## Rodar na Web/PWA

```bash
npm install
npm run verify
npm run serve
```

Abra `http://localhost:8080`. A interface é responsiva para celular, tablet e desktop e pode ser instalada como PWA.

## Gerar APK Android

Requer Android SDK/Android Studio e Java 21.

```bash
npm install
npm run android:prepare
cd android
./gradlew assembleDebug
```

Saída esperada:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Direitos

O código, a interface e os dados fictícios do repositório são próprios. Escudos, marcas, nomes e dados de patches de terceiros devem ser usados somente quando o usuário possuir autorização adequada. Os pacotes privados são ignorados pelo Git e não fazem parte do repositório público.

## Limites conhecidos

A versão 1.0 é uma base funcional extensa, mas não possui o volume de conteúdo, a física 2D completa nem o nível de balanceamento de um jogo comercial produzido por uma equipe grande. O APK automático depende do runner do GitHub Actions, que atualmente encerra os jobs antes das etapas de compilação.
