import { BigInt } from "@graphprotocol/graph-ts"

import {
  Alphasea,
  TournamentCreated,
  ModelCreated,
  PredictionCreated,
  PredictionKeyPublished,
} from "../generated/Alphasea/Alphasea"

import { Tournament, Model, Prediction, PredictionKeyPublication } from "../generated/schema"

export function handleTournamentCreated(event: TournamentCreated): void {
  const params = event.params;
  let entity = Tournament.load(params.tournamentId);
  if (entity) return

  entity = new Tournament(params.tournamentId);
  entity.executionStartAt = params.executionStartAt
  entity.predictionTime = params.predictionTime
  entity.sendingTime = params.sendingTime
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
  if (entity) return

  entity = new Model(params.modelId);
  entity.tournament = params.tournamentId
  entity.owner = params.owner
  entity.predictionLicense = params.predictionLicense
  entity.predictionCount = BigInt.fromI32(0);
  entity.createdAt = event.block.timestamp
  entity.save()
}

export function handlePredictionCreated(event: PredictionCreated): void {
  const params = event.params;
  const id = params.modelId + ':' + params.executionStartAt.toString()
  let entity = Prediction.load(id);
  if (entity) return

  entity = new Prediction(id);
  entity.model = params.modelId
  entity.executionStartAt = params.executionStartAt
  entity.encryptedContent = params.encryptedContent
  entity.createdAt = event.block.timestamp

  const modelEntity = Model.load(params.modelId);
  if (modelEntity) {
    modelEntity.predictionCount += BigInt.fromI32(1);
    modelEntity.save();

    entity.predictionKeyPublication = modelEntity.owner.toHex() + ':' + modelEntity.tournament + ':' + params.executionStartAt.toString()
  }

  entity.save()
}

export function handlePredictionKeyPublished(event: PredictionKeyPublished): void {
  const params = event.params;
  const id = params.owner.toHex() + ':' + params.tournamentId + ':' + params.executionStartAt.toString()
  let entity = PredictionKeyPublication.load(id);
  if (entity) return

  entity = new PredictionKeyPublication(id);
  entity.contentKey = params.contentKey
  entity.createdAt = event.block.timestamp
  entity.save()
}
