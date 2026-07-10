# FutMaster

Protótipo original de um manager de futebol para **Web/PWA** e **Android APK**, usando uma única base em HTML, CSS e JavaScript empacotada com Capacitor.

## Funcionalidades atuais

- criação de carreira e escolha de clube;
- elenco com força, idade, físico e valor;
- formações e estilo de jogo;
- campeonato de ida e volta;
- simulação de rodadas e classificação;
- moral, confiança da diretoria e finanças;
- mercado de transferências;
- histórico de partidas;
- salvamento local;
- interface responsiva para desktop e celular.

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

O workflow `.github/workflows/futmaster-build.yml` valida a versão Web e gera automaticamente um APK de depuração como artefato.

## Patch 2023/24

O patch fornecido foi usado apenas como referência de estrutura. Escudos, marcas e arquivos proprietários não foram publicados nesta branch. O projeto deve usar dados próprios ou um importador local para pacotes que o usuário tenha autorização para utilizar.
