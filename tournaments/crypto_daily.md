
## 提出データ

毎日、各仮想通貨のポジションを提出します。
リバランスは毎日、1:00(UTC)から1時間かけてTWAP執行で行われます。

提出データ例

```text
symbol,position
BTC,0.123
ETH,-0.04
XRP,0.03
LINK,0.2
ATOM,-0.01
DOT,0.04
SOL,0.11
BNB,-0.21
MATIC,0.04
ADA,-0.05
```

要件

- symbolは売買代金が大きいもの
- symbolはFTX indexに存在するもの
- positionの絶対値の合計が1以下

## 予測提出期限

TWAP執行開始の45分前が提出期限です。
提出はethのスマートコントラクトによって行います。
スマートコントラクトの実行は時間がかかる場合があるので、
提出期限ぎりぎりだと期限を過ぎてしまい、
提出が失敗する可能性があります。
実用的には1時間前(0:00(UTC))までのデータを使って予測するのが良いと思います。

## 評価方法

評価は購入者が利用するモデル選択アルゴリズムに依存します。
一般的には、シャープレシオが高いモデルが選ばれやすいと思います。

# In English

## Submission data

Submit the position of each cryptocurrency every day.
Rebalancing takes place daily from 1:00 (UTC) over an hour with TWAP enforcement.

Example of submitted data

```text
symbol, position
BTC, 0.123
ETH, -0.04
XRP, 0.03
LINK, 0.2
ATOM, -0.01
DOT, 0.04
SOL, 0.11
BNB, -0.21
MATIC, 0.04
ADA, -0.05
```

Requirements

- Symbol has a large trading value
- Symbol is in the FTX index
- The total absolute value of position is 1 or less

## The deadline for submission

The deadline for submission is 45 minutes before the start of TWAP execution.
Submission is done by eth's smart contract.
Executing smart contracts can be time consuming, so
If the submission deadline is just around the corner, the deadline will be overdue.
Submission may fail.
Practically, I think it is better to make a prediction using the data up to 1 hour ago (0:00 (UTC)).

## Evaluation

The evaluation depends on the model selection algorithm used by the buyer.
In general, I think it's easy to choose a model with a high Sharpe ratio.
