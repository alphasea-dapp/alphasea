// SPDX-License-Identifier: CC0-1.0

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Alphasea is Initializable, ReentrancyGuard {
    using SafeMath for uint;

    uint constant modelWeightBits = 8;
    uint constant daySeconds = 24 * 60 * 60;

    struct Tournament {
        uint executionStartAt;
        uint predictionTime;
        uint purchaseTime;
        uint shippingTime;
        uint executionPreparationTime;
        uint executionTime;
        uint executionCoolDownTime;
        uint publicationTime;
        string description;

        mapping(address => uint) sumModelWeights; // key: model owner
        uint lockedAmount;
        uint pendingLockedAmount;
        uint pendingLockCreatedAt;
    }

    struct Model {
        address owner;
        uint weight;
        uint pendingWeight;
        uint pendingWeightCreatedAt;
        bytes32 tournamentId;
        mapping(uint64 => Prediction) predictions; // key: executionStartAt
        bytes32 predictionLicense;
    }

    struct Prediction {
        bytes32 modelId;
        bytes32 contentKey;
        uint lockedAmountSnapshot;
        uint price;
        uint64 executionStartAt;
        bytes encryptedContent;
        mapping(address => Purchase) purchases; // key: purchaser
    }

    struct Purchase {
        address purchaser;
        bytes encryptedContentKey;
        bool refunded;
    }

    IERC20 private mainToken;
    mapping(bytes32 => Tournament) private tournaments; // key: tournamentId
    bytes32[] private tournamentIds;
    mapping(bytes32 => Model) private models; // key: modelId
    mapping(address => uint) private balances;

    modifier onlyModelOwner(bytes32 modelId) {
        require(modelExists(models[modelId]), "modelId not exist.");
        require(models[modelId].owner == msg.sender, "model owner only.");
        _;
    }

    modifier onlyPredictionExists(bytes32 modelId, uint64 executionStartAt) {
        require(modelExists(models[modelId]), "modelId not exist.");
        require(predictionExists(models[modelId].predictions[executionStartAt]), "prediction not exist.");
        _;
    }

    modifier checkToken(IERC20 token) {
        require(mainToken == token, "token not allowed.");
        _;
    }

    modifier checkPredictionLicense(bytes32 predictionLicense) {
        require(predictionLicense == "CC0-1.0", "predictionLicense must be CC0-1.0.");
        _;
    }

    modifier checkPrice(uint price) {
        require(price > 0, "price must be positive.");
        _;
    }

    modifier checkModelWeight(uint weight) {
        require(weight > 0, "weight zero.");
        require(weight <= (1 << modelWeightBits), "weight too large.");
        _;
    }

    function initialize(IERC20 mainToken2) public initializer nonReentrant {
        mainToken = mainToken2;
    }

    // account operation

    function lockAsset(IERC20 token, uint amount) external nonReentrant checkToken(token) {
        require(mainToken.balanceOf(msg.sender) >= amount);

        addBalance(amount);
        transferToThisContract(amount);
    }

    function withdrawAsset(IERC20 token, uint amount) external nonReentrant checkToken(token) {
        require(balances[msg.sender] >= amount, "balance < amount.");

        for (uint i = 0; i < tournamentIds.length; i++) {
            Tournament storage tournament = tournaments[tournamentIds[i]];
            processPendingLock(tournament, false, amount);
        }

        balances[msg.sender] = balances[msg.sender].sub(amount);
        transferToUntrustedSender(amount);
    }

    // model operation

    function createModel(bytes32 modelId, bytes32 tournamentId, uint weight, bytes32 predictionLicense) nonReentrant
        external checkModelWeight(weight) checkPredictionLicense(predictionLicense) {

        require(isValidModelId(modelId), "invalid modelId");

        Tournament storage tournament = tournaments[tournamentId];
        require(tournamentExists(tournament), "tournament_id not exists.");

        Model storage model = models[modelId];
        require(!modelExists(model), "modelId already exists.");

        model.owner = msg.sender;
        model.tournamentId = tournamentId;
        model.predictionLicense = predictionLicense;

        processPendingModelWeight(model, tournament, true, weight);
    }

    function setModelWeight(bytes32 modelId, uint weight) nonReentrant
        external onlyModelOwner(modelId) checkModelWeight(weight) {

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        processPendingModelWeight(model, tournament, true, weight);
    }

    // model prediction operation

    function createPrediction(bytes32 modelId, uint64 executionStartAt,
        bytes memory encryptedContent, uint price)
        external nonReentrant checkPrice(price) onlyModelOwner(modelId) {

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimePredictable(tournament, executionStartAt, block.timestamp));

        Prediction storage prediction = model.predictions[executionStartAt];
        require(!predictionExists(prediction), "prediction already exists.");

        processPendingLock(tournament, false, 0);
        processPendingModelWeight(model, tournament, false, 0);

        prediction.modelId = modelId;
        prediction.executionStartAt = executionStartAt;
        uint sumWeights = tournament.sumModelWeights[msg.sender];
        if (sumWeights == 0) {
            prediction.lockedAmountSnapshot = 0;
        } else {
            // prevent overflow
            uint x = tournament.lockedAmount;
            x = Math.min(x, (1 << (256 - modelWeightBits)) - 1);
            prediction.lockedAmountSnapshot = x.mul(model.weight).div(sumWeights);
        }
        prediction.encryptedContent = encryptedContent;
        prediction.price = price;
    }

    function purchasePrediction(bytes32 modelId, uint64 executionStartAt)
        external nonReentrant onlyPredictionExists(modelId, executionStartAt) {

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimePurchasable(tournament, executionStartAt, block.timestamp));

        Prediction storage prediction = models[modelId].predictions[executionStartAt];
        Purchase storage purchase = prediction.purchases[msg.sender];
        require(!purchaseExists(purchase), "Already purchased.");

        require(mainToken.balanceOf(msg.sender) >= prediction.price);

        purchase.purchaser = msg.sender;

        transferToThisContract(prediction.price);
    }

    function shipPrediction(bytes32 modelId, uint64 executionStartAt, address purchaser, bytes memory encryptedContentKey)
        external nonReentrant onlyModelOwner(modelId) onlyPredictionExists(modelId, executionStartAt) {

        require(encryptedContentKey.length > 0, "encryptedContentKey empty.");

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimeShippable(tournament, executionStartAt, block.timestamp));

        Prediction storage prediction = model.predictions[executionStartAt];
        Purchase storage purchase = prediction.purchases[purchaser];
        require(purchaseExists(purchase), "Purchase not found.");
        require(purchase.encryptedContentKey.length > 0, "Already shipped.");

        purchase.encryptedContentKey = encryptedContentKey;

        addBalance(prediction.price);
    }

    function publishPrediction(bytes32 modelId, uint64 executionStartAt, bytes32 contentKey)
        external nonReentrant onlyModelOwner(modelId) onlyPredictionExists(modelId, executionStartAt) {

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimePublishable(tournament, executionStartAt, block.timestamp));

        Prediction storage prediction = model.predictions[executionStartAt];
        require(prediction.contentKey.length > 0, "Already published.");

        prediction.contentKey = contentKey;
    }

    function refundPrediction(bytes32 modelId, uint64 executionStartAt)
        external nonReentrant onlyPredictionExists(modelId, executionStartAt) {

        Model storage model = models[modelId];
        Tournament storage tournament = tournaments[model.tournamentId];
        require(isTimeRefundable(tournament, executionStartAt, block.timestamp));

        Prediction storage prediction = model.predictions[executionStartAt];
        Purchase storage purchase = prediction.purchases[msg.sender];
        require(purchaseExists(purchase), "Purchase not found.");
        require(purchase.encryptedContentKey.length == 0, "Already shipped.");
        require(!purchase.refunded, "Already refunded.");

        purchase.refunded = true;
        addBalance(prediction.price);
    }

    // private

    function tournamentExists(Tournament storage tournament) private view returns (bool) {
        return tournament.predictionTime > 0;
    }

    function modelExists(Model storage model) private view returns (bool) {
        return model.owner != address(0);
    }

    function predictionExists(Prediction storage prediction) private view returns (bool) {
        return prediction.modelId != 0;
    }

    function purchaseExists(Purchase storage purchase) private view returns (bool) {
        return purchase.purchaser != address(0);
    }

    function transferToThisContract(uint amount) private {
        uint256 allowance = mainToken.allowance(msg.sender, address(this));
        require(allowance >= amount, "allowance < amount");
        mainToken.transferFrom(msg.sender, address(this), amount);
    }

    function transferToUntrustedSender(uint amount) private {
        mainToken.transfer(msg.sender, amount);
    }

    // timeline

    function isTimeWeightChangeable(Tournament storage tournament, uint time) private view returns (bool) {
        uint startAt = (tournament.executionStartAt + daySeconds).sub(tournament.executionPreparationTime)
            .sub(tournament.shippingTime).sub(tournament.purchaseTime).sub(tournament.predictionTime);
        return (time - startAt).mod(daySeconds) < tournament.predictionTime;
    }

    function isTime(Tournament storage tournament, uint executionStartAt, uint time) private view returns (bool) {
        uint endAt = executionStartAt.sub(tournament.executionPreparationTime).sub(tournament.shippingTime).sub(tournament.purchaseTime);
        uint startAt = endAt.sub(tournament.predictionTime);
        return startAt <= time && time < endAt;
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
        uint startAt = executionStartAt.add(tournament.executionTime).add(tournament.executionCoolDownTime);
        uint endAt = startAt.add(tournament.publicationTime);
        return startAt <= time && time < endAt;
    }

    // pending requests

    function processPendingModelWeight(Model storage model, Tournament storage tournament, bool setWeight, uint weight) private {
        if (model.pendingWeightCreatedAt > 0 && isTimeWeightChangeable(tournament, model.pendingWeightCreatedAt)) {
            model.weight = model.pendingWeight;
            model.pendingWeightCreatedAt = 0;
        }

        if (!setWeight) return;

        if (isTimeWeightChangeable(tournament, block.timestamp)) {
            int weightDiff = int(weight) - int(model.weight);
            model.weight = weight;
            if (weightDiff > 0) {
                tournament.sumModelWeights[msg.sender] = tournament.sumModelWeights[msg.sender].add(uint(weightDiff));
            } else {
                tournament.sumModelWeights[msg.sender] = tournament.sumModelWeights[msg.sender].sub(uint(-weightDiff));
            }
        } else {
            model.pendingWeight = weight;
            model.pendingWeightCreatedAt = block.timestamp;
        }
    }

    function processPendingLock(Tournament storage tournament, bool isLock, uint amount) private {
        if (tournament.pendingLockCreatedAt > 0 && isTimeWeightChangeable(tournament, tournament.pendingLockCreatedAt)) {
            tournament.lockedAmount = tournament.pendingLockedAmount;
            tournament.pendingLockCreatedAt = 0;
        }

        if (amount == 0) return;

        if (isTimeWeightChangeable(tournament, block.timestamp)) {
            if (isLock) {
                tournament.lockedAmount = tournament.lockedAmount.add(amount);
            } else {
                tournament.lockedAmount = tournament.lockedAmount.sub(amount);
            }
            tournament.pendingLockedAmount = tournament.lockedAmount;
        } else {
            if (isLock) {
                tournament.pendingLockedAmount = tournament.pendingLockedAmount.add(amount);
            } else {
                tournament.pendingLockedAmount = tournament.pendingLockedAmount.sub(amount);
            }
            tournament.pendingLockCreatedAt = block.timestamp;
        }
    }

    function addBalance(uint amount) private {
        for (uint i = 0; i < tournamentIds.length; i++) {
            Tournament storage tournament = tournaments[tournamentIds[i]];
            processPendingLock(tournament, true, amount);
        }
        balances[msg.sender] = balances[msg.sender].add(amount);
    }

    // strings

    function isValidModelId(bytes32 y) private pure returns (bool) {
        bool terminated = false;
        for (uint i = 0; i < 32; i++) {
            uint8 x = uint8(y[i]);

            if (terminated) {
                if (x != 0) return false;
                continue;
            }

            if (x == 0) {
                if (i == 0) return false;
                terminated = true;
                continue;
            }

            if (!isNum(x) && !isAlpha(x) && !isHyphen(x) && !isUnderscore(x)) {
                return false;
            }
        }

        return false;
    }

    function isNum(uint8 x) private pure returns (bool) {
        return 0x30 <= x && x <= 0x39;
    }

    function isAlpha(uint8 x) private pure returns (bool) {
        return (0x41 <= x && x <= 0x5a) || (0x61 <= x && x <= 0x7a);
    }

    function isHyphen(uint8 x) private pure returns (bool) {
        return x == 0x2d;
    }

    function isUnderscore(uint8 x) private pure returns (bool) {
        return x == 0x5f;
    }
}
