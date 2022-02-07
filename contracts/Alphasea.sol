// SPDX-License-Identifier: CC0-1.0
// https://github.com/alphasea-dapp/alphasea

pragma solidity 0.8.11;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Alphasea {
    using SafeMath for uint;

    uint constant DAY_SECONDS = 24 * 60 * 60;

    struct TournamentParams {
        string tournamentId;
        uint32 executionStartAt;
        uint32 predictionTime;
        uint32 sendingTime;
        uint32 executionPreparationTime;
        uint32 executionTime;
        uint32 publicationTime;
        string description;
    }

    struct Tournament {
        uint32 executionStartAt;
        uint32 predictionTime;
        uint32 sendingTime;
        uint32 executionPreparationTime;
        uint32 executionTime;
        uint32 publicationTime;
        string description;
    }

    struct Model {
        address owner;
        string tournamentId;
        string predictionLicense;
    }

    event PublicKeyChanged(address owner, bytes publicKey);
    event TournamentCreated(string tournamentId,
        uint executionStartAt,
        uint predictionTime,
        uint sendingTime,
        uint executionPreparationTime,
        uint executionTime,
        uint publicationTime,
        string description);
    event ModelCreated(string modelId, address owner, string tournamentId, string predictionLicense);
    event PredictionCreated(string modelId, uint executionStartAt, bytes encryptedContent);
    event PredictionKeyPublished(address owner, string tournamentId, uint executionStartAt, bytes32 contentKey);
    event PredictionKeySent(address owner, string tournamentId, uint executionStartAt, address receiver, bytes encryptedContentKey);

    mapping(address => bytes) public publicKeys;
    mapping(string => Tournament) public tournaments; // key: tournamentId
    mapping(string => Model) public models; // key: modelId

    modifier onlyModelOwner(string calldata modelId) {
        require(modelExists(models[modelId]), "modelId not exist.");
        require(models[modelId].owner == msg.sender, "model owner only.");
        _;
    }

    modifier checkPredictionLicense(string calldata predictionLicense) {
        require(strEquals(predictionLicense, "CC0-1.0"), "predictionLicense must be CC0-1.0.");
        _;
    }

    constructor (TournamentParams[] memory tournaments2) {
        for (uint i = 0; i < tournaments2.length; i++) {
            TournamentParams memory t = tournaments2[i];
            Tournament storage tournament = tournaments[t.tournamentId];
            tournament.executionStartAt = t.executionStartAt;
            tournament.predictionTime = t.predictionTime;
            tournament.sendingTime = t.sendingTime;
            tournament.executionPreparationTime = t.executionPreparationTime;
            tournament.executionTime = t.executionTime;
            tournament.publicationTime = t.publicationTime;
            tournament.description = t.description;

            emit TournamentCreated(
                t.tournamentId,
                t.executionStartAt,
                t.predictionTime,
                t.sendingTime,
                t.executionPreparationTime,
                t.executionTime,
                t.publicationTime,
                t.description
            );
        }
    }

    // account operation

    function changePublicKey(bytes calldata publicKey) external {
        require(publicKey.length > 0, "publicKey empty");
        publicKeys[msg.sender] = publicKey;
        emit PublicKeyChanged(msg.sender, publicKey);
    }

    // model operation

    struct CreateModelParam {
        string modelId;
        string tournamentId;
        string predictionLicense;
    }

    function createModels(CreateModelParam[] calldata params)
    external {
        require(params.length > 0, "empty params");

        for (uint i = 0; i < params.length; i++) {
            createModel(params[i].modelId, params[i].tournamentId, params[i].predictionLicense);
        }
    }

    function createModel(string calldata modelId, string calldata tournamentId, string calldata predictionLicense)
    private checkPredictionLicense(predictionLicense) {

        require(isValidModelId(modelId), "invalid modelId");

        Tournament storage tournament = tournaments[tournamentId];
        require(tournamentExists(tournament), "tournament_id not exists.");

        Model storage model = models[modelId];
        require(!modelExists(model), "modelId already exists.");

        model.owner = msg.sender;
        model.tournamentId = tournamentId;
        model.predictionLicense = predictionLicense;

        emit ModelCreated(modelId, msg.sender, tournamentId, predictionLicense);
    }

    // model prediction operation

    struct CreatePredictionParam {
        string modelId;
        uint executionStartAt;
        bytes encryptedContent;
    }

    function createPredictions(CreatePredictionParam[] calldata params)
    external {
        require(params.length > 0, "empty params");

        for (uint i = 0; i < params.length; i++) {
            createPrediction(params[i].modelId, params[i].executionStartAt,
                params[i].encryptedContent);
        }
    }

    function createPrediction(string calldata modelId, uint executionStartAt,
        bytes calldata encryptedContent)
    private onlyModelOwner(modelId) {

        require(encryptedContent.length > 0, "encryptedContent empty");

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isValidExecutionStartAt(tournament, executionStartAt), "executionStartAt is invalid");
        require(isTimePredictable(tournament, executionStartAt, getTimestamp()), "createPrediction is forbidden now");

        emit PredictionCreated(modelId, executionStartAt, encryptedContent);
    }

    function publishPredictionKey(string calldata tournamentId,
        uint executionStartAt, bytes calldata contentKeyGenerator)
    external {
        address owner = msg.sender;

        require(contentKeyGenerator.length > 0, "contentKeyGenerator empty");

        Tournament storage tournament = tournaments[tournamentId];
        require(isTimePublishable(tournament, executionStartAt, getTimestamp()), "publishPrediction is forbidden now");

        bytes32 contentKey = keccak256(abi.encodePacked(contentKeyGenerator, owner));
        emit PredictionKeyPublished(owner, tournamentId, executionStartAt, contentKey);
    }

    struct SendPredictionKeyParam {
        address receiver;
        bytes encryptedContentKey;
    }

    function sendPredictionKeys(string calldata tournamentId,
        uint executionStartAt, SendPredictionKeyParam[] calldata params)
    external {
        require(params.length > 0, "empty params");

        for (uint i = 0; i < params.length; i++) {
            require(params[i].receiver != msg.sender, "cannot send to me");
            require(params[i].encryptedContentKey.length > 0, "encryptedContentKey empty");
            require(publicKeys[params[i].receiver].length > 0, "publicKey empty");
        }

        {
            Tournament storage tournament = tournaments[tournamentId];
            require(isTimeSendable(tournament, executionStartAt, getTimestamp()), "sendPredictionKeys is forbidden now");
        }

        for (uint i = 0; i < params.length; i++) {
            emit PredictionKeySent(msg.sender, tournamentId,
                executionStartAt, params[i].receiver, params[i].encryptedContentKey);
        }
    }

    // private

    function tournamentExists(Tournament storage tournament) private view returns (bool) {
        return tournament.predictionTime > 0;
    }

    function modelExists(Model storage model) private view returns (bool) {
        return model.owner != address(0);
    }

    // timeline

    function isValidExecutionStartAt(Tournament storage tournament, uint executionStartAt) private view returns (bool) {
        return executionStartAt.mod(tournament.executionTime) == tournament.executionStartAt;
    }

    function isTimePredictable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime).sub(tournament.sendingTime);
        uint startAt = endAt.sub(tournament.predictionTime);
        return startAt <= time && time < endAt;
    }

    function isTimeSendable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime);
        uint startAt = endAt.sub(tournament.sendingTime);
        return startAt <= time && time < endAt;
    }

    function isTimeRefundable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime);
        return endAt <= time;
    }

    function isTimePublishable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint startAt = executionStartAt.add(tournament.executionTime).add(DAY_SECONDS);
        uint endAt = startAt.add(tournament.publicationTime);
        return startAt <= time && time < endAt;
    }

    // strings

    function isValidModelId(string memory y) private pure returns (bool) {
        bytes memory z = bytes(y);

        if (z.length < 4 || z.length > 31) return false;

        // 小文字のc識別子
        uint8 x = uint8(z[0]);
        if (!isAlphaLowercase(x) && !isUnderscore(x)) {
            return false;
        }

        for (uint i = 1; i < z.length; i++) {
            x = uint8(z[i]);

            if (!isNum(x) && !isAlphaLowercase(x) && !isUnderscore(x)) {
                return false;
            }
        }

        return true;
    }

    function isNum(uint8 x) private pure returns (bool) {
        return 0x30 <= x && x <= 0x39;
    }

    function isAlphaLowercase(uint8 x) private pure returns (bool) {
        return 0x61 <= x && x <= 0x7a;
    }

    function isUnderscore(uint8 x) private pure returns (bool) {
        return x == 0x5f;
    }

    function strEquals(string memory x, string memory y) private pure returns (bool) {
        return keccak256(abi.encodePacked(x)) == keccak256(abi.encodePacked(y));
    }

    function getTimestamp() private view returns (uint) {
        return block.timestamp;
    }
}
