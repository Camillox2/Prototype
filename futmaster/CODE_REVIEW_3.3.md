# Code review FutMaster 3.3

## Correções

- 2D antigo substituído pela visualização Pro com 22 jogadores e sequências de eventos;
- nomes compactados no mobile para evitar sobreposição;
- controles do replay adaptados a telas pequenas;
- cálculo financeiro da automação passou a comparar folha com receita anualizada, evitando decisões prematuras;
- proteção de elencos, base, histórico e saves mantida pelo hardening 3.2;
- futebol feminino legado neutralizado sem quebrar saves anteriores;
- manifesto, cache PWA, versão e identidade Android atualizados;
- singleplayer continua independente do backend multiplayer.

## Validações executadas na build privada

- 1.000 partidas simuladas;
- média de 2,81 gols, 2,4 cartões e 0,587 lesão por partida;
- 179 pacotes, 2.903 clubes, 80.174 jogadores e 2.900 escudos validados;
- navegador em 390×844 e 1366×900 sem overflow, botões abaixo do mínimo ou erros de página;
- protocolo e servidor multiplayer testados com dois clientes WebSocket;
- APK compilado com Gradle 8.14.3, compile/target SDK 36;
- APK verificado por ZIP e assinatura v2.

## Limite conhecido

A Partida 2D Pro é uma reconstrução animada dos eventos do motor estatístico. Ela não possui física contínua de bola e colisões equivalente a um jogo de ação 3D.
