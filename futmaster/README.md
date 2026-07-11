# FutMaster 0.5

Manager de futebol original para **Web/PWA** e **Android APK**, com funcionamento totalmente local. A mesma carreira combina clube, seleção, grupo multiclubes, competições, contratos, torcida, infraestrutura e um universo dinâmico salvo no aparelho.

## Motor de partidas

- simulação minuto a minuto;
- overall por posição;
- forma, moral, físico, ritmo, entrosamento e personalidade;
- mando, tática, treinador, expulsões, lesões e substituições;
- posse, finalizações, xG, cartões, gols e assistências;
- zebras raras e explicáveis;
- clima e altitude alterando ritmo, desgaste e risco;
- árbitros com rigor, qualidade, pressão e precisão do VAR;
- reconstrução visual 2D baseada nos eventos da súmula.

A visualização 2D é uma reconstrução narrativa dos eventos calculados pelo motor, não uma física completa de vinte e dois jogadores.

## Automação

Há três modos principais:

- **Manual**;
- **Assistido por departamento**;
- **Automático geral**.

Áreas delegáveis:

| Área | Responsável | Decisões |
|---|---|---|
| Futebol | Diretor de futebol | escalação, tática, contratos, inscrições e empréstimos |
| Base | Diretor da base | desenvolvimento, foco e promoções |
| Scouting | Chefe de scouting | observação e mercado |
| Médico | Chefe médico | recuperação e prevenção |
| Comercial | Diretor comercial | marca, mídia e campanhas |
| Sócios e torcida | Diretor de relacionamento | planos, preços e retenção |
| Estádio | Gerente de estádio | ingressos e operação |
| Finanças | Diretor financeiro | orçamento, folha e risco |

Os clubes adquiridos também podem operar automaticamente ou receber controle manual de tática, treino, autonomia e escalação.

## Competições

- Liga Nacional;
- Copa Nacional;
- Supercopa;
- Copa Continental;
- Série B simulada;
- Mundial de Seleções com grupos e mata-mata;
- amistosos, Liga das Nações e eliminatórias;
- seleções Sub-17, Sub-20 e Olímpica;
- histórico de campeões e temporadas.

## Seleções

O treinador pode comandar clube e seleção simultaneamente.

- propostas de emprego;
- convocação;
- calendário internacional;
- reputação internacional;
- Mundial de Seleções;
- programas Sub-17, Sub-20 e Olímpico;
- modo manual ou automático por categoria.

## Grupo multiclubes

- compra de clubes fictícios;
- caixa e elenco separados;
- técnico e autonomia próprios;
- resultados semanais;
- empréstimos internos;
- scouting compartilhado;
- controle estratégico ou manual;
- formação, mentalidade, treino e escalação por subsidiária.

## Imprensa e vestiário

- coletivas com respostas que alteram moral, torcida, mídia e diretoria;
- rumores e controvérsias;
- líderes e grupos internos;
- conflitos;
- promessas de minutos;
- mediação ou apoio a um dos lados;
- coesão e hierarquia do elenco.

## Rivalidades, clima e arbitragem

- rivalidades que aumentam após jogos equilibrados e partidas violentas;
- retrospecto dos clássicos;
- chuva, calor, frio, vento e temporal;
- condição do gramado e altitude;
- árbitros com perfis diferentes;
- decisões do VAR e controvérsias.

## Regulamentos e punições

- limite de elenco;
- limite de estrangeiros;
- auditorias;
- multas;
- bloqueio de transferências;
- partidas com portões fechados;
- inspeção de segurança e compliance.

## Estádio e infraestrutura

Projetos de longo prazo:

- nova arquibancada;
- cobertura integral;
- museu;
- hotel;
- hub de transporte;
- cidade esportiva;
- novo estádio.

As obras possuem custo, duração e efeitos permanentes.

## Futebol feminino

- criação do departamento;
- elenco e finanças próprios;
- modo manual ou automático;
- investimento baixo, moderado ou alto;
- categorias de base;
- calendário e resultados;
- reputação e títulos.

## Carreira e legado

- salário e patrimônio pessoal do treinador;
- investimentos particulares;
- biografia;
- Hall da Fama;
- ídolos;
- camisas aposentadas;
- recordes da era;
- histórico de temporadas.

## Contratos, mercado e governança

A base 0.4 permanece integrada:

- agentes, comissão e relacionamento;
- salário, luvas, bônus, direitos de imagem e multa;
- empréstimos;
- janela e inscrições;
- treino e logística;
- conselho, eleições, investidores e SAF;
- editor local;
- exportação JSON.

## Armazenamento

Tudo funciona localmente:

- `localStorage`;
- PWA offline;
- exportação de save;
- nenhuma conta;
- nenhum backend;
- nenhum banco de dados externo;
- nenhum multiplayer.

## Arquitetura

- `www/core.js`: atletas, equipes, atributos e overall;
- `www/match-engine.js`: motor de partidas;
- `www/systems.js`: administração e mundo ativo;
- `www/app.js`: carreira principal;
- `www/career-v04.js`: contratos, competições, treino e governança;
- `www/international-v04.js`: seleções e grupo multiclubes;
- `www/universe-v05.js`: imprensa, vestiário, rivalidades, clima, árbitros, punições, Mundial, futebol feminino, estádio e legado;
- `www/match2d-v05.js`: reconstrução visual 2D;
- `www/v04-compat.js`: compatibilidade dos saves;
- `www/styles.css`, `www/v04.css` e `www/v05.css`: interface responsiva.

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

APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Conteúdo e direitos

Escudos, marcas e arquivos proprietários de patches não são publicados. O repositório usa clubes fictícios e está preparado para importação local de conteúdo autorizado.

## Próximas melhorias naturais

- física 2D mais detalhada com vinte e dois jogadores;
- editor completo de regulamentos e campeonatos;
- mais países, divisões e calendários;
- mercado mundial mais profundo entre clubes controlados pela IA;
- falência, recuperação judicial e reestruturação de dívida mais detalhadas;
- carreira como presidente ou proprietário após aposentadoria.
