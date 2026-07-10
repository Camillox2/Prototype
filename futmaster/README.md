# FutMaster

Manager de futebol original para **Web/PWA** e **Android APK**, usando uma única base em HTML, CSS e JavaScript empacotada com Capacitor.

## Gestão do clube

A carreira agora inclui:

- elenco principal, contratos, salários, condição física, moral, potencial e lesões;
- categorias **Sub-20, Sub-17 e Sub-15**, evolução e promoção de atletas;
- direção de futebol, base, scouting, departamento médico, comercial, relacionamento com torcedores, estádio e finanças;
- contratação e demissão de profissionais com competência, salário, luvas e rescisão;
- modos **manual**, **assistido por departamento** e **automático**;
- sócios, mensalidades, satisfação, fidelidade e campanhas;
- preço de ingressos, público, ocupação, bilheteria, operação do estádio, loja e alimentação;
- patrocinadores, valor da marca e receitas comerciais;
- folha salarial, custos semanais, livro-caixa e orçamento;
- estádio, centro de treinamento, centro da base, centro médico e rede de scouting;
- mercado de transferências, renovações e lista de observação;
- campeonato, táticas, escalação automática e histórico.

## Delegação e modo automático

Cada área pode receber um responsável:

| Área | Profissional |
|---|---|
| Futebol | Diretor de futebol |
| Base | Diretor da base |
| Scouting | Chefe de scouting |
| Médico | Chefe médico |
| Comercial | Diretor comercial |
| Sócios e torcida | Diretor de relacionamento |
| Estádio | Gerente de estádio |
| Finanças | Diretor financeiro |

O profissional recebe salário e toma decisões semanais quando a área está delegada. A competência influencia o resultado das decisões.

Os modos são:

- **Manual:** o jogador controla todas as áreas.
- **Assistido:** escolhe quais departamentos serão delegados.
- **Automático:** todos os departamentos com responsável trabalham automaticamente.

## Rodar na Web

```bash
npm install
npm run serve
```

Abra `http://localhost:8080`.

## Gerar APK Android

Requer Android Studio/Android SDK e Java 21.

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

## GitHub Actions

O workflow `.github/workflows/futmaster-build.yml` valida o JavaScript e gera automaticamente um APK de depuração como artefato.

## Dados e patch 2023/24

O patch fornecido foi usado apenas como referência estrutural. Escudos, marcas e arquivos proprietários não são publicados nesta branch. O projeto deve usar dados próprios ou importação local de conteúdos cuja utilização seja autorizada.

## Próximas expansões

A arquitetura já permite adicionar calendário de várias competições, empréstimos, agentes, negociação detalhada, conselho deliberativo, eleições, inadimplência de sócios, setores do estádio, segurança, logística, viagens, futebol feminino e múltiplas temporadas.
