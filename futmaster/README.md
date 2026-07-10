# FutMaster 0.3

Manager de futebol original para **Web/PWA** e **Android APK**, com uma única base em HTML, CSS e JavaScript empacotada com Capacitor.

## Motor de partidas

A versão 0.3 substitui a geração simples de placares por uma simulação minuto a minuto:

- escalação de 11 titulares e banco;
- overall calculado por posição a partir de atributos técnicos, físicos, mentais e de goleiro;
- penalidade por improvisação;
- forma, moral, físico, ritmo e entrosamento individuais;
- força de ataque, meio, defesa e goleiro;
- mando de campo, treinador, mentalidade e instruções táticas;
- posse, finalizações, chutes no alvo, xG, escanteios e faltas;
- gols, assistências, defesas, cartões, expulsões, lesões e substituições;
- alterações táticas automáticas conforme placar e minuto;
- notas individuais e atualização de estatísticas;
- variação de desempenho do dia e acontecimentos que permitem zebras raras.

Em uma simulação de calibração com 1.000 partidas, uma equipe de nível aproximado 60 jogando em casa venceu uma de nível 90 em cerca de 5% dos jogos. O resultado não é travado pelo overall, mas a diferença de qualidade continua muito relevante.

## Jogadores e desenvolvimento

Cada atleta possui:

- atributos técnicos, físicos, mentais e específicos de goleiro;
- posição natural e compatibilidade com outras funções;
- overall atual e potencial;
- moral, forma, condição física, ritmo, entrosamento e felicidade;
- personalidade, regularidade, disciplina e propensão a lesões;
- contrato, salário, papel prometido e valor de mercado;
- gols, assistências, minutos, cartões e nota média;
- foco individual de desenvolvimento;
- envelhecimento, regressão, fim de contrato e aposentadoria prática.

## Gestão automática

Há três modos:

- **Manual:** todas as decisões ficam com o jogador.
- **Assistido:** cada departamento pode ser delegado separadamente.
- **Automático geral:** todos os setores com responsável trabalham semanalmente.

Departamentos disponíveis:

| Área | Responsável | Decisões automáticas |
|---|---|---|
| Futebol | Diretor de futebol | escalação, tática e renovações |
| Base | Diretor da base | desenvolvimento e promoções |
| Scouting | Chefe de scouting | relatórios e novos alvos |
| Médico | Chefe médico | recuperação e prevenção |
| Comercial | Diretor comercial | marca, mídia e campanhas |
| Sócios e torcida | Diretor de relacionamento | preços, campanhas e retenção |
| Estádio | Gerente de estádio | preços por setor e operação |
| Finanças | Diretor financeiro | orçamento, folha e controle de risco |

Cada responsável tem competência, personalidade, salário e custo de contratação. O jogador define política, autonomia e pode assumir o controle novamente a qualquer momento. O modo geral consegue contratar automaticamente responsáveis quando uma área está vazia.

## Administração do clube

- categorias Sub-15, Sub-17 e Sub-20;
- promoção de jovens e novas gerações anuais;
- sócios Popular, Prata e Ouro;
- mensalidades, inadimplência, satisfação, fidelidade e pressão da torcida;
- setores Popular, Cadeiras, Premium e Camarotes;
- demanda por preço, público, ocupação e bilheteria;
- alimentação, estacionamento, loja e custos operacionais;
- patrocínio, marca, mídia e alcance internacional;
- folha salarial, contratos, transferências e livro-caixa;
- CT, base, centro médico, scouting, análise e estádio;
- objetivos da diretoria, confiança e risco financeiro;
- mundo ativo: outros clubes treinam, escalam, contratam e envelhecem seus elencos;
- múltiplas temporadas e histórico de partidas.

## Arquitetura

- `www/core.js`: dados, atributos, jogadores, equipes, overall e calendário;
- `www/match-engine.js`: simulação minuto a minuto e aplicação de resultados;
- `www/systems.js`: departamentos, automação, economia, torcida, base e mundo ativo;
- `www/rules.js`: cumprimento de suspensões e duração efetiva das lesões;
- `www/app.js`: estado da carreira, ações e interface;
- `www/styles.css`: interface responsiva para desktop e celular.

## Rodar na Web

```bash
npm install
npm run verify
npm run serve
```

Abra `http://localhost:8080`.

## Gerar APK Android

Requer Android SDK/Android Studio e Java 21.

```bash
npm install
npm run android:prepare
cd android
./gradlew assembleDebug
```

O APK será gerado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Dados e patch 2023/24

O patch fornecido é usado somente como referência estrutural e para futura importação local. Escudos, marcas e arquivos proprietários não são publicados no repositório. Uma versão pública deve utilizar conteúdo próprio, licenciado ou importado localmente pelo usuário com autorização.

## Limites atuais e próximas camadas

A 0.3 já entrega um núcleo funcional amplo, mas ainda não equivale à profundidade total de um produto comercial como Football Manager. As próximas camadas naturais são:

- múltiplas divisões, estaduais, copas e competições continentais;
- empréstimos, agentes, bônus e negociação contratual detalhada;
- calendário diário, viagens, logística e treino por sessão;
- conselho, eleições, SAF, investidores e regras regulatórias;
- futebol feminino e seleções;
- banco de dados grande importado e editor completo;
- visualização 2D da partida e multiplayer assíncrono;
- backend para nuvem, contas e sincronização entre aparelhos.
