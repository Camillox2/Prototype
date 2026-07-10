# FutMaster 0.4

Manager de futebol original para **Web/PWA** e **Android APK**, com funcionamento totalmente local. A mesma carreira armazena clube, seleção, competições, contratos, grupo multiclubes e automações no aparelho.

## Motor de partidas

- simulação minuto a minuto;
- overall por posição e penalidade por improvisação;
- forma, moral, físico, ritmo, entrosamento e personalidade;
- mando, treinador, tática, expulsões, lesões e substituições;
- posse, finalizações, xG, escanteios, faltas, cartões, gols e assistências;
- notas e estatísticas individuais;
- variação controlada que permite zebras raras.

Em testes de calibração, uma equipe de nível aproximado 60 venceu uma de nível 90 em cerca de 5% dos jogos como mandante.

## Competições locais

- Liga Nacional;
- Copa Nacional com eliminatórias;
- Supercopa;
- Copa Continental a partir da segunda temporada;
- Série B simulada;
- classificação continental;
- histórico de campeões e temporadas.

## Seleções

O treinador pode comandar **clube e seleção simultaneamente**.

- propostas de emprego internacional;
- Brasil, Argentina, Portugal, Itália, Espanha, França, Alemanha, Inglaterra, Uruguai, Colômbia, Croácia e Japão;
- convocações e seleção automática dos melhores 23;
- amistosos, Liga das Nações e eliminatórias;
- reputação internacional do treinador;
- calendário e histórico próprios da seleção;
- possibilidade de deixar a seleção sem abandonar o clube.

Nenhum escudo ou identidade oficial é incluído.

## Grupo multiclubes

O usuário pode formar um grupo empresarial de futebol e adquirir clubes fictícios de outros países.

- compra de clubes;
- caixa e elenco independentes por subsidiária;
- técnico contratado para cada clube;
- autonomia e estratégia esportiva;
- resultados e finanças semanais automáticos;
- compartilhamento de scouting;
- empréstimo de jovens entre clubes do grupo;
- retorno de atletas ao clube principal;
- venda automática quando uma subsidiária entra em crise.

## Contratos e mercado

- agentes com influência, relacionamento e comissão;
- propostas conservadoras, justas ou generosas;
- salário, luvas, papel no elenco e multa rescisória;
- bônus por presença, gols e direitos de imagem;
- empréstimos de entrada e saída;
- divisão salarial e taxa de empréstimo;
- janela de transferências;
- inscrições com limite de elenco;
- renovação automática pelo diretor de futebol.

## Treino e logística

- intensidade leve, moderada, alta ou extrema;
- foco em ataque, defesa, físico, posse, bola parada ou equilíbrio;
- evolução de atributos;
- risco de lesão relacionado à intensidade;
- dia de descanso;
- transporte por ônibus, avião comercial ou voo fretado;
- hotel econômico, confortável ou de luxo;
- custos e impacto físico em partidas fora.

## Conselho, SAF e investidores

- clube associativo;
- presidente e perfil político;
- eleições periódicas;
- aprovação do conselho;
- limite de endividamento;
- propostas de grupos locais, nacionais e globais;
- conversão para SAF;
- participação vendida, aporte e exigências do investidor.

## Gestão automática

Há três modos:

- **Manual:** todas as decisões ficam com o jogador;
- **Assistido:** setores específicos são delegados;
- **Automático geral:** a diretoria opera todas as áreas.

Departamentos automatizáveis:

| Área | Responsável | Decisões |
|---|---|---|
| Futebol | Diretor de futebol | escalação, tática, inscrições, contratos e empréstimos |
| Base | Diretor da base | foco de treino, desenvolvimento e promoções |
| Scouting | Chefe de scouting | relatórios e novos alvos |
| Médico | Chefe médico | recuperação, prevenção e ajuste de carga |
| Comercial | Diretor comercial | marca, alcance e campanhas |
| Sócios e torcida | Diretor de relacionamento | planos, preços e retenção |
| Estádio | Gerente de estádio | ingressos e operação |
| Finanças | Diretor financeiro | orçamento, folha, dívida e risco |

Os clubes adquiridos também funcionam automaticamente com gestor, estratégia e autonomia próprios.

## Editor e armazenamento local

- editor local de nome, sigla, estádio e caixa;
- exportação da carreira em JSON;
- save principal e módulos complementares no `localStorage`;
- funcionamento offline via PWA;
- nenhuma conta, backend ou banco de dados externo.

## Arquitetura

- `www/core.js`: jogadores, equipes, atributos e overall;
- `www/match-engine.js`: motor de partidas;
- `www/systems.js`: departamentos, economia e mundo ativo;
- `www/rules.js`: suspensões e lesões;
- `www/app.js`: carreira principal e interface;
- `www/career-v04.js`: competições, contratos, treino, logística, governança e editor;
- `www/international-v04.js`: seleções e grupo multiclubes;
- `www/v04-compat.js`: migração e consistência dos saves;
- `www/styles.css` e `www/v04.css`: interface responsiva.

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

O patch fornecido é usado somente como referência estrutural e para futura importação local. Escudos, marcas e arquivos proprietários não são publicados. Uma versão pública deve utilizar conteúdo próprio, licenciado ou importado pelo usuário com autorização.

## Próximas camadas possíveis

- visualização 2D das partidas;
- entrevistas, imprensa e redes sociais;
- rivalidades e clássicos dinâmicos;
- arbitragem, VAR e reputação dos árbitros;
- seleções de base e torneios Sub-20;
- futebol feminino;
- construção de estádios e cidades esportivas;
- falências, recuperação judicial e punições;
- editor avançado de campeonatos e regras;
- histórias emergentes, biografias e hall da fama.
