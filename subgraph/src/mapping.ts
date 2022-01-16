import { BigInt } from "@graphprotocol/graph-ts"

import {
  Alphasea,
  TournamentCreated,
  ModelCreated,
  PredictionCreated,
  PredictionPublished,
  PurchaseCreated,
  PurchaseShipped,
  PurchaseRefunded,
} from "../generated/Alphasea/Alphasea"

import { Tournament, Model, Prediction, Purchase } from "../generated/schema"

export function handleTournamentCreated(event: TournamentCreated): void {
  const params = event.params;
  let entity = Tournament.load(params.tournamentId);

  if (!entity) {
    entity = new Tournament(params.tournamentId);
  }

  entity.executionStartAt = params.executionStartAt
  entity.predictionTime = params.predictionTime
  entity.purchaseTime = params.purchaseTime
  entity.shippingTime = params.shippingTime
  entity.executionPreparationTime = params.executionPreparationTime
  entity.executionTime = params.executionTime
  entity.publicationTime = params.publicationTime
  entity.description = params.description
  entity.createdAt = event.block.timestamp
  entity.save()
}

export function handleModelCreated(event: ModelCreated): void {
  const params = event.params;
  let entity = Model.load(params.modelId);

  if (!entity) {
    entity = new Model(params.modelId);
  }

  entity.tournament = params.tournamentId
  entity.owner = params.owner
  entity.predictionLicense = params.predictionLicense
  entity.createdAt = event.block.timestamp
  entity.totalEarnings = BigInt.fromI32(0);
  entity.predictionCount = BigInt.fromI32(0);
  entity.publishedPredictionCount = BigInt.fromI32(0);
  entity.purchaseCount = BigInt.fromI32(0);
  entity.shippedPurchaseCount = BigInt.fromI32(0);
  entity.refundedPurchaseCount = BigInt.fromI32(0);
  entity.save()
}

export function handlePredictionCreated(event: PredictionCreated): void {
  const params = event.params;
  const id = params.modelId + ':' + params.executionStartAt.toString()
  let entity = Prediction.load(id);

  if (!entity) {
    entity = new Prediction(id);
  }

  entity.model = params.modelId
  entity.price = params.price
  entity.encryptedContent = params.encryptedContent
  entity.createdAt = event.block.timestamp
  entity.updatedAt = event.block.timestamp
  entity.purchaseCount = BigInt.fromI32(0);
  entity.shippedPurchaseCount = BigInt.fromI32(0);
  entity.refundedPurchaseCount = BigInt.fromI32(0);
  entity.save()

  const modelEntity = Model.load(params.modelId);
  if (modelEntity) {
    modelEntity.predictionCount += BigInt.fromI32(1);
    modelEntity.save();
  }
}

export function handlePredictionPublished(event: PredictionPublished): void {
  const params = event.params;
  const id = params.modelId + ':' + params.executionStartAt.toString()
  let entity = Prediction.load(id);

  if (!entity) {
    entity = new Prediction(id);
  }

  entity.model = params.modelId
  entity.contentKey = params.contentKey
  entity.updatedAt = event.block.timestamp
  entity.save()

  const modelEntity = Model.load(params.modelId);
  if (modelEntity) {
    modelEntity.publishedPredictionCount += BigInt.fromI32(1);
    modelEntity.save();
  }
}

export function handlePurchaseCreated(event: PurchaseCreated): void {
  const params = event.params;
  const predictionId = params.modelId + ':' + params.executionStartAt.toString()
  const id = predictionId + ':' + params.purchaser.toHex()
  let entity = Purchase.load(id);

  if (!entity) {
    entity = new Purchase(id);
  }

  entity.purchaser = params.purchaser
  entity.publicKey = params.publicKey
  entity.prediction = predictionId
  entity.refunded = false;
  entity.createdAt = event.block.timestamp
  entity.updatedAt = event.block.timestamp
  entity.save()

  const modelEntity = Model.load(params.modelId);
  const predictionEntity = Prediction.load(predictionId);
  if (modelEntity) {
    modelEntity.purchaseCount += BigInt.fromI32(1);
    modelEntity.save();
  }
  if (predictionEntity) {
    predictionEntity.purchaseCount += BigInt.fromI32(1);
    predictionEntity.save();
  }
}

export function handlePurchaseShipped(event: PurchaseShipped): void {
  const params = event.params;
  const predictionId = params.modelId + ':' + params.executionStartAt.toString()
  const id = predictionId + ':' + params.purchaser.toHex()
  let entity = Purchase.load(id);

  if (!entity) {
    entity = new Purchase(id);
  }

  entity.prediction = predictionId
  entity.encryptedContentKey = params.encryptedContentKey
  entity.updatedAt = event.block.timestamp
  entity.save()

  const modelEntity = Model.load(params.modelId);
  const predictionEntity = Prediction.load(predictionId);
  if (modelEntity && predictionEntity) {
    modelEntity.shippedPurchaseCount += BigInt.fromI32(1);
    modelEntity.totalEarnings += predictionEntity.price;
    modelEntity.save();
  }
  if (predictionEntity) {
    predictionEntity.shippedPurchaseCount += BigInt.fromI32(1);
    predictionEntity.save();
  }
}

export function handlePurchaseRefunded(event: PurchaseRefunded): void {
  const params = event.params;
  const predictionId = params.modelId + ':' + params.executionStartAt.toString()
  const id = predictionId + ':' + params.purchaser.toHex()
  let entity = Purchase.load(id);

  if (!entity) {
    entity = new Purchase(id);
  }

  entity.prediction = predictionId
  entity.refunded = true
  entity.updatedAt = event.block.timestamp
  entity.save()

  const modelEntity = Model.load(params.modelId);
  const predictionEntity = Prediction.load(predictionId);
  if (modelEntity) {
    modelEntity.refundedPurchaseCount += BigInt.fromI32(1);
    modelEntity.save();
  }
  if (predictionEntity) {
    predictionEntity.refundedPurchaseCount += BigInt.fromI32(1);
    predictionEntity.save();
  }
}
