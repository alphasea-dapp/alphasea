# AlphaSea

[AlphaSea](https://alphasea.io/) is a decentralized marketplace for market alpha.

This repository contains

- AlphaSea smart contract written in solidity
- AlphaSea subgraph definition

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
```bash
npx hardhat node --hostname 0.0.0.0
```

コントラクトデプロイ
```bash
npx hardhat run --network localhost scripts/deploy.js
```

### test

```bash
npx hardhat coverage
```

### thegraph

```bash
cd subgraph
yarn install
npm run codegen
npm run build
```

```bash
ローカルethに対してローカルgraph-node起動
docker-compose up -d
```

ローカルgraph-nodeへsubgraphデプロイ
subgraph.yamlのdataSources[0].source.addressを、
デプロイしたコントラクトアドレスに書き換える。

```bash
npm run create-local
npm run deploy-local
```

thegraph hosted

- https://thegraph.com/hosted-service/subgraph/richmanbtc/alphasea-polygon
- https://thegraph.com/hosted-service/subgraph/richmanbtc/alphasea-mumbai

### testnet (ropsten)

ropsten用のgeth起動
peerを見つけるのに時間がかかる。

```bash
docker-compose -f docker-compose-ropsten.yml up -d
```

generate private key and address for ropsten
example: https://gist.github.com/miguelmota/3793b160992b4ea0b616497b8e5aee2f

deposit eth on faucet site

set ROPSTEN_PRIVATE_KEY env var
deploy contract to ropsten 

```bash
npx hardhat clean
npx hardhat compile
npx hardhat run --network ropsten scripts/deploy.js
```

deploy thegraph to thegraph.com (only richmanbtc can do)

subgraph/subgraph-ropsten.yaml内のdataSources[0].source.addressを、
デプロイしたコントラクトアドレスに書き換える。

```bash
cd subgraph
npm run codegen
npx graph auth --product hosted-service $THEGRAPH_COM_ACCESS_TOKEN
npm run deploy-ropsten
```

https://thegraph.com/hosted-service/subgraph/richmanbtc/alphasea-ropsten

以下のALPHASEA_CONTRACT_ADDRESSとALPHASEA_CONTRACT_ABIを書き換える。
ALPHASEA_CONTRACT_ABIは npm run print_abi で取得できる。

https://github.com/alphasea-dapp/alphasea-agent/blob/master/docker-compose-ropsten.yml

### testnet (mumbai)

set ROPSTEN_PRIVATE_KEY env var

```bash
npx hardhat clean
npx hardhat compile
npx hardhat run --network mumbai scripts/deploy.js
```

subgraph/subgraph-mumbai.yaml内のdataSources[0].source.addressを、
デプロイしたコントラクトアドレスに書き換える。

```bash
cd subgraph
npm run codegen
npx graph auth --product hosted-service $THEGRAPH_COM_ACCESS_TOKEN
npm run deploy-mumbai
```

### mainnet deploy (polygon)

set POLYGON_PRIVATE_KEY env var

```bash
export POLYGON_PRIVATE_KEY=$(cat /path/to/private_key)
```

```bash
npx hardhat clean
npx hardhat compile
npx hardhat run --network polygon scripts/deploy.js
```

subgraph/subgraph-polygon.yaml内のdataSources[0].source.addressを、
デプロイしたコントラクトアドレスに書き換える。

```bash
cd subgraph
npm run codegen
npx graph auth --product hosted-service $THEGRAPH_COM_ACCESS_TOKEN
npm run deploy-polygon
```

### verification (ropsten)

set env var ETHERSCAN_API_KEY

```bash
npx hardhat run --network ropsten scripts/verify.js
```

### verification (mumbai)

set env var POLYGONSCAN_API_KEY

```bash
npx hardhat run --network mumbai scripts/verify.js
```

### verification (polygon)

set env var POLYGONSCAN_API_KEY

```bash
npx hardhat run --network polygon scripts/verify.js
```

### security check

docker run -it -v $(pwd)/:/alphasea:ro trailofbits/eth-security-toolbox

docker run -it -v $(pwd)/:/alphasea:ro mythril/myth

### CI

github actionsでビルドを行っている。

設定: .github/workflows/build.yml

### Contract design

- PredictionとPurchaseは数が多いので、contractからreadしないものは、eventに書き込んでgas代を節約する
- 他コントラクトから全てのデータを検証できるようにgetterを作った (automatic getterで足りるものは作らない)
