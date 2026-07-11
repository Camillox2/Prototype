# Code review FutMaster 2.0

## Problemas encontrados e corrigidos

1. **Migração 0.4 alterava globalmente `clamp`**
   - removido o monkey patch global;
   - migração agora corrige somente os campos antigos do save.

2. **Categorias de base podiam crescer indefinidamente**
   - normalização de Sub-15, Sub-17 e Sub-20;
   - limites de 18, 20 e 22 atletas;
   - elenco profissional limitado a 30, com mínimo operacional de 23.

3. **Sócios e preços podiam gerar inflação excessiva**
   - teto proporcional à base de torcedores;
   - limites de preço por categoria;
   - inadimplência e quantidade normalizadas após economia e automação.

4. **Slots antigos não incluíam módulos recentes**
   - os módulos 0.7–2.0 são agrupados dentro de uma chave já contemplada pelo backup 0.6;
   - restauração automática quando uma chave do módulo estiver ausente.

5. **Módulos novos podiam permanecer ativos ao trocar de tela**
   - 1.1, 1.2, 1.3 e 2.0 liberam o estado da tela ao clicar em outro item da navegação;
   - a animação 2D é interrompida ao sair da partida.

6. **Mídia usava resultado fora do escopo em semanas sem partida**
   - resultado inicializado de forma segura;
   - patrocinadores continuam funcionando sem jogo recente.

## Validação local da build privada

- 1.000 partidas simuladas;
- média de gols, cartões e lesões dentro das faixas esperadas;
- 10 temporadas automáticas na suíte principal;
- stress manual de 15 temporadas;
- elenco entre 23 e 30 jogadores;
- categorias de base limitadas;
- economia sem valores infinitos ou estouro bilionário;
- 60 telas abertas em Chromium com viewport de celular;
- criação de carreira e disputa de rodada;
- partida 2D avançada aberta após jogos;
- 179 pacotes privados validados;
- 2.903 clubes e 80.174 jogadores verificados;
- 2.900 escudos associados.

## Limite externo

A geração do APK depende do Android SDK, Java, Gradle e dependências do Capacitor. O workflow do GitHub vinha falhando antes de executar qualquer etapa e sem produzir logs. Isso é tratado separadamente da validação do código Web/PWA.
