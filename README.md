# AlphaSea

AlphaSea is a decentralized marketplace for market alpha.

## 今の仕組み

以下がベースになっています。
burnはやめました。

https://note.com/btcml/n/n7662cc156466

## Development

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
node scripts/deploy.js
npx hardhat help
```

ローカルeth起動
npx hardhat node

コントラクトデプロイ
npx hardhat run --network localhost scripts/deploy.js


### thegraph

cd subgraph
yarn install
npm run codegen
npm run build

ローカルethに対してローカルgraph-node起動
docker-compose up -d

ローカルgraph-nodeへsubgraphデプロイ
subgraph.yamlのdataSources[0].source.addressを、
デプロイしたコントラクトアドレスに書き換える。

npm run create-local
npm run deploy-local
