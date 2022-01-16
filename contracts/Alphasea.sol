// SPDX-License-Identifier: CC0-1.0

pragma solidity 0.8.11;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract Alphasea is ReentrancyGuard {
    using SafeMath for uint;

    uint constant DAY_SECONDS = 24 * 60 * 60;

    struct TournamentParams {
        string tournamentId;
        uint32 executionStartAt;
        uint32 predictionTime;
        uint32 purchaseTime;
        uint32 shippingTime;
        uint32 executionPreparationTime;
        uint32 executionTime;
        uint32 publicationTime;
        string description;
    }

    struct Tournament {
        uint32 executionStartAt;
        uint32 predictionTime;
        uint32 purchaseTime;
        uint32 shippingTime;
        uint32 executionPreparationTime;
        uint32 executionTime;
        uint32 publicationTime;
        string description;
    }

    struct Model {
        address owner;
        string tournamentId;
        string predictionLicense;
        mapping(uint => Prediction) predictions; // key: executionStartAt
    }

    // PredictionとPurchaseは数が多いので、
    // contractからreadしないものは、
    // eventに書き込んでgas代を節約する

    struct Prediction {
        uint248 price;
        bool published;
        mapping(address => Purchase) purchases; // key: purchaser
    }

    struct Purchase {
        bool created;
        bool shipped;
        bool refunded;
    }

    event TournamentCreated(string tournamentId,
        uint executionStartAt,
        uint predictionTime,
        uint purchaseTime,
        uint shippingTime,
        uint executionPreparationTime,
        uint executionTime,
        uint publicationTime,
        string description);
    event ModelCreated(string modelId, address owner, string tournamentId, string predictionLicense);
    event PredictionCreated(string modelId, uint executionStartAt, uint price, bytes encryptedContent);
    event PredictionPublished(string modelId, uint executionStartAt, bytes32 contentKey);
    event PurchaseCreated(string modelId, uint executionStartAt, address purchaser, bytes publicKey);
    event PurchaseShipped(string modelId, uint executionStartAt, address purchaser, bytes encryptedContentKey);
    event PurchaseRefunded(string modelId, uint executionStartAt, address purchaser);

    mapping(string => Tournament) public tournaments; // key: tournamentId
    mapping(string => Model) public models; // key: modelId
    //    mapping(address => uint) public balances;

    modifier onlyModelOwner(string calldata modelId) {
        require(modelExists(models[modelId]), "modelId not exist.");
        require(models[modelId].owner == msg.sender, "model owner only.");
        _;
    }

    modifier onlyPredictionExists(string calldata modelId, uint executionStartAt) {
        require(modelExists(models[modelId]), "modelId not exist.");
        require(predictionExists(models[modelId].predictions[executionStartAt]), "prediction not exist.");
        _;
    }

    modifier checkPredictionLicense(string calldata predictionLicense) {
        require(strEquals(predictionLicense, "CC0-1.0"), "predictionLicense must be CC0-1.0.");
        _;
    }

    modifier checkPrice(uint price) {
        require(price > 0, "price must be positive.");
        require(price <= type(uint248).max, "price must be < 2^248");
        _;
    }

    constructor (TournamentParams[] memory tournaments2) {
        for (uint i = 0; i < tournaments2.length; i++) {
            TournamentParams memory t = tournaments2[i];
            Tournament storage tournament = tournaments[t.tournamentId];
            tournament.executionStartAt = t.executionStartAt;
            tournament.predictionTime = t.predictionTime;
            tournament.purchaseTime = t.purchaseTime;
            tournament.shippingTime = t.shippingTime;
            tournament.executionPreparationTime = t.executionPreparationTime;
            tournament.executionTime = t.executionTime;
            tournament.publicationTime = t.publicationTime;
            tournament.description = t.description;

            emit TournamentCreated(
                t.tournamentId,
                t.executionStartAt,
                t.predictionTime,
                t.purchaseTime,
                t.shippingTime,
                t.executionPreparationTime,
                t.executionTime,
                t.publicationTime,
                t.description
            );
        }
    }

    // account operation

    //    function withdraw() external nonReentrant {
    //        require(balances[msg.sender] > 0, "balance == 0.");
    //
    //        uint amount = balances[msg.sender];
    //        balances[msg.sender] = 0;
    //        payable(msg.sender).transfer(amount);
    //    }

    // model operation

    struct CreateModelParam {
        string modelId;
        string tournamentId;
        string predictionLicense;
    }

    function createModels(CreateModelParam[] calldata params)
    external nonReentrant {
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
        uint price;
    }

    function createPredictions(CreatePredictionParam[] calldata params)
    external nonReentrant {
        require(params.length > 0, "empty params");

        for (uint i = 0; i < params.length; i++) {
            createPrediction(params[i].modelId, params[i].executionStartAt,
                params[i].encryptedContent, params[i].price);
        }
    }

    function createPrediction(string calldata modelId, uint executionStartAt,
        bytes calldata encryptedContent, uint price)
    private checkPrice(price) onlyModelOwner(modelId) {

        require(encryptedContent.length > 0, "encryptedContent empty");

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isValidExecutionStartAt(tournament, executionStartAt), "executionStartAt is invalid");
        require(isTimePredictable(tournament, executionStartAt, getTimestamp()), "createPrediction is forbidden now");

        Prediction storage prediction = model.predictions[executionStartAt];
        require(!predictionExists(prediction), "prediction already exists.");

        prediction.price = uint248(price);

        emit PredictionCreated(modelId, executionStartAt, price, encryptedContent);
    }

    struct PublishPredictionParam {
        string modelId;
        uint executionStartAt;
        bytes contentKeyGenerator;
    }

    function publishPredictions(PublishPredictionParam[] calldata params)
    external nonReentrant {
        require(params.length > 0, "empty params");

        for (uint i = 0; i < params.length; i++) {
            publishPrediction(params[i].modelId, params[i].executionStartAt,
                params[i].contentKeyGenerator);
        }
    }

    function publishPrediction(string calldata modelId, uint executionStartAt, bytes calldata contentKeyGenerator)
    private onlyModelOwner(modelId) onlyPredictionExists(modelId, executionStartAt) {

        require(contentKeyGenerator.length > 0, "contentKeyGenerator empty");

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimePublishable(tournament, executionStartAt, getTimestamp()), "publishPrediction is forbidden now");

        Prediction storage prediction = model.predictions[executionStartAt];
        require(!prediction.published, "Already published.");

        bytes32 contentKey = keccak256(abi.encodePacked(contentKeyGenerator, modelId));

        prediction.published = true;

        emit PredictionPublished(modelId, executionStartAt, contentKey);
    }

    struct CreatePurchaseParam {
        string modelId;
        uint executionStartAt;
        bytes publicKey;
    }

    function createPurchases(CreatePurchaseParam[] calldata params)
    external payable nonReentrant {
        require(params.length > 0, "empty params");

        uint sumPrice = 0;
        for (uint i = 0; i < params.length; i++) {
            uint price = createPurchase(params[i].modelId, params[i].executionStartAt,
                params[i].publicKey);
            sumPrice = sumPrice.add(price);
        }

        require(msg.value == sumPrice, "sent eth mismatch.");
    }

    function createPurchase(string calldata modelId, uint executionStartAt, bytes calldata publicKey)
    private onlyPredictionExists(modelId, executionStartAt) returns (uint) {

        require(publicKey.length > 0, "publicKey empty");

        Model storage model = models[modelId];
        require(model.owner != msg.sender, "cannot purchase my models.");
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimePurchasable(tournament, executionStartAt, getTimestamp()), "createPurchase is forbidden now");

        Prediction storage prediction = models[modelId].predictions[executionStartAt];
        Purchase storage purchase = prediction.purchases[msg.sender];
        require(!purchaseExists(purchase), "Already purchased.");

        purchase.created = true;

        emit PurchaseCreated(modelId, executionStartAt, msg.sender, publicKey);

        return prediction.price;
    }

    struct ShipPurchaseParam {
        string modelId;
        uint executionStartAt;
        address purchaser;
        bytes encryptedContentKey;
    }

    function shipPurchases(ShipPurchaseParam[] calldata params)
    external nonReentrant {
        require(params.length > 0, "empty params");

        uint sumPrice = 0;
        for (uint i = 0; i < params.length; i++) {
            uint price = shipPurchase(params[i].modelId, params[i].executionStartAt,
                params[i].purchaser, params[i].encryptedContentKey);
            sumPrice = sumPrice.add(price);
        }

        payable(msg.sender).transfer(sumPrice);
        //        addBalance(sumPrice);
    }

    function shipPurchase(string calldata modelId, uint executionStartAt, address purchaser, bytes calldata encryptedContentKey)
    private onlyModelOwner(modelId) onlyPredictionExists(modelId, executionStartAt) returns (uint) {

        require(encryptedContentKey.length > 0, "encryptedContentKey empty.");

        Model storage model = models[modelId];
        {
            Tournament storage tournament = tournaments[model.tournamentId];
            require(isTimeShippable(tournament, executionStartAt, getTimestamp()), "shipPurchase is forbidden now");
        }

        Prediction storage prediction = model.predictions[executionStartAt];
        {
            Purchase storage purchase = prediction.purchases[purchaser];
            require(purchaseExists(purchase), "Purchase not found.");
            require(!purchase.shipped, "Already shipped.");
            purchase.shipped = true;
        }

        emit PurchaseShipped(modelId, executionStartAt, purchaser, encryptedContentKey);

        return prediction.price;
    }

    struct RefundPurchaseParam {
        string modelId;
        uint executionStartAt;
    }

    function refundPurchases(RefundPurchaseParam[] calldata params)
    external nonReentrant {
        require(params.length > 0, "empty params");

        uint sumPrice = 0;
        for (uint i = 0; i < params.length; i++) {
            uint price = refundPurchase(params[i].modelId, params[i].executionStartAt);
            sumPrice = sumPrice.add(price);
        }

        payable(msg.sender).transfer(sumPrice);
        //        addBalance(sumPrice);
    }

    function refundPurchase(string calldata modelId, uint executionStartAt)
    private onlyPredictionExists(modelId, executionStartAt) returns (uint) {

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimeRefundable(tournament, executionStartAt, getTimestamp()), "refundPurchase is forbidden now");

        Prediction storage prediction = model.predictions[executionStartAt];
        Purchase storage purchase = prediction.purchases[msg.sender];
        require(purchaseExists(purchase), "Purchase not found.");
        require(!purchase.shipped, "Already shipped.");
        require(!purchase.refunded, "Already refunded.");

        purchase.refunded = true;

        emit PurchaseRefunded(modelId, executionStartAt, msg.sender);

        return prediction.price;
    }

    // private

    function tournamentExists(Tournament storage tournament) private view returns (bool) {
        return tournament.predictionTime > 0;
    }

    function modelExists(Model storage model) private view returns (bool) {
        return model.owner != address(0);
    }

    function predictionExists(Prediction storage prediction) private view returns (bool) {
        return prediction.price > 0;
    }

    function purchaseExists(Purchase storage purchase) private view returns (bool) {
        return purchase.created;
    }

    // timeline

    function isValidExecutionStartAt(Tournament storage tournament, uint executionStartAt) private view returns (bool) {
        return executionStartAt.mod(DAY_SECONDS) == tournament.executionStartAt;
    }

    function isTimePredictable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime).sub(tournament.shippingTime).sub(tournament.purchaseTime);
        uint startAt = endAt.sub(tournament.predictionTime);
        return startAt <= time && time < endAt;
    }

    function isTimePurchasable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime).sub(tournament.shippingTime);
        uint startAt = endAt.sub(tournament.purchaseTime);
        return startAt <= time && time < endAt;
    }

    function isTimeShippable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime);
        uint startAt = endAt.sub(tournament.shippingTime);
        return startAt <= time && time < endAt;
    }

    function isTimeRefundable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime);
        return endAt <= time;
    }

    function isTimePublishable(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint startAt = executionStartAt.add(tournament.executionTime);
        uint endAt = startAt.add(tournament.publicationTime);
        return startAt <= time && time < endAt;
    }

    // pending requests

    //    function addBalance(uint amount) private {
    //        balances[msg.sender] = balances[msg.sender].add(amount);
    //    }

    // strings

    function isValidModelId(string memory y) private pure returns (bool) {
        bytes memory z = bytes(y);

        if (z.length < 4 || z.length > 31) return false;

        // c識別子
        uint8 x = uint8(z[0]);
        if (!isAlpha(x) && !isUnderscore(x)) {
            return false;
        }

        for (uint i = 1; i < z.length; i++) {
            x = uint8(z[i]);

            if (!isNum(x) && !isAlpha(x) && !isUnderscore(x)) {
                return false;
            }
        }

        return true;
    }

    function isNum(uint8 x) private pure returns (bool) {
        return 0x30 <= x && x <= 0x39;
    }

    function isAlpha(uint8 x) private pure returns (bool) {
        return (0x41 <= x && x <= 0x5a) || (0x61 <= x && x <= 0x7a);
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
