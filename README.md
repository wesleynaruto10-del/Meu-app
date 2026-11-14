# Minhas Compras

Aplicativo web (PWA) para usar no celular na hora das compras no mercado.

- Registra produto, quantidade e valor, e mostra o total da compra em tempo real.
- Lê o código de barras pela câmera e preenche o nome do produto automaticamente
  (base aberta [Open Food Facts](https://world.openfoodfacts.org)). Se o produto não
  estiver na base, você digita o nome uma vez e o app lembra nas próximas leituras.
- Ao informar o produto, mostra quanto você pagou nas últimas 3 compras.
- Avisa se o preço digitado está mais caro ou mais barato que da última vez.
- Orçamento da compra, com barra que mostra quanto ainda resta.
- Lista de compras: monte em casa e, no mercado, toque no item para informar só o preço.
- Lista por voz: toque em **Falar os itens** e dite ("dois leites, arroz e pão"); diga "pronto" para terminar.
- Botões + e − para ajustar a quantidade direto no item.
- Compra por voz: toque em **Falar produto e preço** e diga "arroz 24 e 90".
- Preço por kg, litro ou unidade quando o nome traz o tamanho ("Arroz 5kg"), comparando com outros tamanhos já comprados.
- Comparação de mercados: mostra onde o produto saiu mais barato.
- Sugestões para a lista com base na frequência de compra de cada produto.
- Lembrete de backup a cada 30 dias.
- Enviar a lista de compras (WhatsApp ou outro app) e importar uma lista recebida, colando o texto ou abrindo o link.
- Reconhece o mesmo produto escrito de formas parecidas ("Arroz 5kg" e "Arroz de 5 kg") e permite juntar produtos repetidos.
- Mantém o histórico de todas as compras finalizadas.
- Resumo com o total gasto por mês, média por compra e produtos em que mais gastou.
- Edita compras já finalizadas (data, mercado, itens e preços).
- Exporta/importa backup em arquivo `.json`.
- Exporta o histórico para planilha (`.csv`, abre no Excel e no Google Planilhas).

Os dados ficam salvos apenas no próprio aparelho (`localStorage`); não há servidor nem conta.

## Como usar no celular

A câmera só funciona em páginas `https`. A forma mais simples é publicar com o GitHub Pages:

1. No GitHub, abra **Settings → Pages**.
2. Em **Source**, escolha **Deploy from a branch**, selecione a branch com estes arquivos e a pasta `/ (root)`.
3. Abra no celular o endereço informado (`https://<usuario>.github.io/<repositorio>/`).
4. No menu do navegador, toque em **Adicionar à tela inicial** para instalar como aplicativo.

## Rodar no computador

```sh
python3 -m http.server 8000
# abra http://localhost:8000
```

Não há etapa de build: são apenas arquivos estáticos (`index.html`, `style.css`, `app.js`).

## Jogo (pasta `jogo/`)

RPG de ação em pixel art, separado do app de compras: abra `jogo/index.html`
(ou `/jogo/` no endereço do site). Escolha um herói, saia da vila, derrote
inimigos, sobreviva às ondas, vença o chefe e entre no portal para o próximo reino.
Os heróis ficam em `jogo/personagens.js` (nome, cores, atributos, golpe e habilidade).
O progresso é salvo no próprio aparelho.
