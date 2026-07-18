// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title BatonEstate
/// @notice Revocable onchain inheritance reserves. Owners deposit assets,
///         maintain a heartbeat, and name beneficiaries by claim-secret
///         commitment. If the heartbeat and grace period lapse, the estate
///         activates and beneficiaries claim their share with the secret.
///         Carry it. Protect it. Pass it on.
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract BatonEstate {
    // ---------------------------------------------------------------- types

    struct Estate {
        address owner;
        address guardian;        // optional; zero address = permissionless activation
        uint64 lastHeartbeat;
        uint64 heartbeatInterval;
        uint64 gracePeriod;
        bool activated;
        bool cancelled;
    }

    struct Beneficiary {
        bytes32 commitment;      // keccak256(secret); secret travels in the claim link
        uint16 shareBps;         // basis points, all shares must total 10_000
        bool claimed;
        address claimedBy;
    }

    uint16 public constant TOTAL_BPS = 10_000;
    address public constant ETH = address(0);
    uint256 public constant MAX_BENEFICIARIES = 10;
    uint256 public constant MAX_TOKENS = 10;

    // -------------------------------------------------------------- storage

    uint256 public estateCount;
    mapping(uint256 => Estate) public estates;
    mapping(uint256 => Beneficiary[]) internal _beneficiaries;
    mapping(uint256 => address[]) internal _tokens;               // enumerable, ETH excluded
    mapping(uint256 => mapping(address => bool)) internal _tokenKnown;
    mapping(uint256 => mapping(address => uint256)) public balances;   // live balances, ETH = address(0)
    mapping(uint256 => mapping(address => uint256)) public snapshots;  // frozen at activation

    uint256 private _lock = 1;

    // --------------------------------------------------------------- events

    event EstateCreated(uint256 indexed estateId, address indexed owner, uint64 heartbeatInterval, uint64 gracePeriod, address guardian);
    event Heartbeat(uint256 indexed estateId, uint64 timestamp);
    event Deposited(uint256 indexed estateId, address indexed token, uint256 amount);
    event Withdrawn(uint256 indexed estateId, address indexed token, uint256 amount, address to);
    event BeneficiariesSet(uint256 indexed estateId, uint256 count);
    event GuardianSet(uint256 indexed estateId, address guardian);
    event IntervalsSet(uint256 indexed estateId, uint64 heartbeatInterval, uint64 gracePeriod);
    event EstateActivated(uint256 indexed estateId, address indexed activatedBy);
    event EstateCancelled(uint256 indexed estateId);
    event Claimed(uint256 indexed estateId, uint256 indexed beneficiaryIndex, address indexed claimedBy);

    // --------------------------------------------------------------- errors

    error NotOwner();
    error NotGuardian();
    error NotActive();
    error AlreadyActivated();
    error AlreadyCancelled();
    error AlreadyClaimed();
    error NotYetExpired();
    error BadShares();
    error BadCommitment();
    error BadIntervals();
    error TooMany();
    error ZeroAmount();
    error InsufficientBalance();
    error TransferFailed();
    error Reentrancy();

    // ------------------------------------------------------------ modifiers

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    modifier onlyOwner(uint256 estateId) {
        if (msg.sender != estates[estateId].owner) revert NotOwner();
        _;
    }

    modifier liveEstate(uint256 estateId) {
        Estate storage e = estates[estateId];
        if (e.owner == address(0) || e.cancelled) revert AlreadyCancelled();
        if (e.activated) revert AlreadyActivated();
        _;
    }

    // ------------------------------------------------------------ lifecycle

    /// @notice Create an estate. Beneficiary secrets are committed as hashes;
    ///         the plaintext secret is shared with each heir off-chain via a claim link.
    function createEstate(
        uint64 heartbeatInterval,
        uint64 gracePeriod,
        address guardian,
        bytes32[] calldata commitments,
        uint16[] calldata sharesBps
    ) external returns (uint256 estateId) {
        if (heartbeatInterval == 0) revert BadIntervals();
        estateId = estateCount++;
        Estate storage e = estates[estateId];
        e.owner = msg.sender;
        e.guardian = guardian;
        e.lastHeartbeat = uint64(block.timestamp);
        e.heartbeatInterval = heartbeatInterval;
        e.gracePeriod = gracePeriod;
        _setBeneficiaries(estateId, commitments, sharesBps);
        emit EstateCreated(estateId, msg.sender, heartbeatInterval, gracePeriod, guardian);
    }

    /// @notice "Keep carrying the baton." Resets the inactivity clock.
    function heartbeat(uint256 estateId) external onlyOwner(estateId) liveEstate(estateId) {
        estates[estateId].lastHeartbeat = uint64(block.timestamp);
        emit Heartbeat(estateId, uint64(block.timestamp));
    }

    /// @notice Anyone (or only the guardian, if one is set) may activate an
    ///         estate whose heartbeat + grace period have lapsed. Balances are
    ///         snapshotted so claims are computed against a frozen total.
    function activateEstate(uint256 estateId) external liveEstate(estateId) {
        Estate storage e = estates[estateId];
        if (block.timestamp <= uint256(e.lastHeartbeat) + e.heartbeatInterval + e.gracePeriod) {
            revert NotYetExpired();
        }
        if (e.guardian != address(0) && msg.sender != e.guardian) revert NotGuardian();
        e.activated = true;

        snapshots[estateId][ETH] = balances[estateId][ETH];
        address[] storage toks = _tokens[estateId];
        for (uint256 i = 0; i < toks.length; i++) {
            snapshots[estateId][toks[i]] = balances[estateId][toks[i]];
        }
        emit EstateActivated(estateId, msg.sender);
    }

    /// @notice Owner can cancel any time before activation. All assets return home.
    function cancelEstate(uint256 estateId) external onlyOwner(estateId) liveEstate(estateId) nonReentrant {
        Estate storage e = estates[estateId];
        e.cancelled = true;

        uint256 ethBal = balances[estateId][ETH];
        if (ethBal > 0) {
            balances[estateId][ETH] = 0;
            _payETH(e.owner, ethBal);
            emit Withdrawn(estateId, ETH, ethBal, e.owner);
        }
        address[] storage toks = _tokens[estateId];
        for (uint256 i = 0; i < toks.length; i++) {
            uint256 bal = balances[estateId][toks[i]];
            if (bal > 0) {
                balances[estateId][toks[i]] = 0;
                if (!IERC20(toks[i]).transfer(e.owner, bal)) revert TransferFailed();
                emit Withdrawn(estateId, toks[i], bal, e.owner);
            }
        }
        emit EstateCancelled(estateId);
    }

    // --------------------------------------------------------------- assets

    function depositETH(uint256 estateId) external payable liveEstate(estateId) {
        if (msg.value == 0) revert ZeroAmount();
        balances[estateId][ETH] += msg.value;
        emit Deposited(estateId, ETH, msg.value);
    }

    function depositToken(uint256 estateId, address token, uint256 amount) external liveEstate(estateId) {
        if (amount == 0) revert ZeroAmount();
        if (!_tokenKnown[estateId][token]) {
            if (_tokens[estateId].length >= MAX_TOKENS) revert TooMany();
            _tokenKnown[estateId][token] = true;
            _tokens[estateId].push(token);
        }
        if (!IERC20(token).transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
        balances[estateId][token] += amount;
        emit Deposited(estateId, token, amount);
    }

    /// @notice Owner withdraws freely before activation. Revocability is the point.
    function withdraw(uint256 estateId, address token, uint256 amount, address to)
        external
        onlyOwner(estateId)
        liveEstate(estateId)
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (balances[estateId][token] < amount) revert InsufficientBalance();
        balances[estateId][token] -= amount;
        if (token == ETH) {
            _payETH(to, amount);
        } else {
            if (!IERC20(token).transfer(to, amount)) revert TransferFailed();
        }
        emit Withdrawn(estateId, token, amount, to);
    }

    // -------------------------------------------------------------- config

    function setBeneficiaries(uint256 estateId, bytes32[] calldata commitments, uint16[] calldata sharesBps)
        external
        onlyOwner(estateId)
        liveEstate(estateId)
    {
        delete _beneficiaries[estateId];
        _setBeneficiaries(estateId, commitments, sharesBps);
    }

    function setGuardian(uint256 estateId, address guardian) external onlyOwner(estateId) liveEstate(estateId) {
        estates[estateId].guardian = guardian;
        emit GuardianSet(estateId, guardian);
    }

    function setIntervals(uint256 estateId, uint64 heartbeatInterval, uint64 gracePeriod)
        external
        onlyOwner(estateId)
        liveEstate(estateId)
    {
        if (heartbeatInterval == 0) revert BadIntervals();
        estates[estateId].heartbeatInterval = heartbeatInterval;
        estates[estateId].gracePeriod = gracePeriod;
        emit IntervalsSet(estateId, heartbeatInterval, gracePeriod);
    }

    // --------------------------------------------------------------- claims

    /// @notice Heir claims with the secret from their claim link. Assets flow to
    ///         msg.sender — the Magic wallet created when they signed in.
    function claim(uint256 estateId, uint256 beneficiaryIndex, bytes calldata secret) external nonReentrant {
        Estate storage e = estates[estateId];
        if (!e.activated) revert NotActive();
        Beneficiary storage b = _beneficiaries[estateId][beneficiaryIndex];
        if (b.claimed) revert AlreadyClaimed();
        if (keccak256(secret) != b.commitment) revert BadCommitment();

        b.claimed = true;
        b.claimedBy = msg.sender;

        uint256 ethShare = (snapshots[estateId][ETH] * b.shareBps) / TOTAL_BPS;
        if (ethShare > 0) {
            balances[estateId][ETH] -= ethShare;
            _payETH(msg.sender, ethShare);
        }
        address[] storage toks = _tokens[estateId];
        for (uint256 i = 0; i < toks.length; i++) {
            uint256 share = (snapshots[estateId][toks[i]] * b.shareBps) / TOTAL_BPS;
            if (share > 0) {
                balances[estateId][toks[i]] -= share;
                if (!IERC20(toks[i]).transfer(msg.sender, share)) revert TransferFailed();
            }
        }
        emit Claimed(estateId, beneficiaryIndex, msg.sender);
    }

    // ---------------------------------------------------------------- views

    function beneficiaries(uint256 estateId) external view returns (Beneficiary[] memory) {
        return _beneficiaries[estateId];
    }

    function tokens(uint256 estateId) external view returns (address[] memory) {
        return _tokens[estateId];
    }

    /// @notice Seconds until the estate becomes activatable. Zero when expired.
    function timeRemaining(uint256 estateId) external view returns (uint256) {
        Estate storage e = estates[estateId];
        uint256 deadline = uint256(e.lastHeartbeat) + e.heartbeatInterval + e.gracePeriod;
        return block.timestamp >= deadline ? 0 : deadline - block.timestamp;
    }

    function isExpired(uint256 estateId) external view returns (bool) {
        Estate storage e = estates[estateId];
        return block.timestamp > uint256(e.lastHeartbeat) + e.heartbeatInterval + e.gracePeriod;
    }

    // ------------------------------------------------------------- internal

    function _setBeneficiaries(uint256 estateId, bytes32[] calldata commitments, uint16[] calldata sharesBps) internal {
        if (commitments.length != sharesBps.length || commitments.length == 0) revert BadShares();
        if (commitments.length > MAX_BENEFICIARIES) revert TooMany();
        uint256 total;
        for (uint256 i = 0; i < commitments.length; i++) {
            if (commitments[i] == bytes32(0)) revert BadCommitment();
            total += sharesBps[i];
            _beneficiaries[estateId].push(
                Beneficiary({commitment: commitments[i], shareBps: sharesBps[i], claimed: false, claimedBy: address(0)})
            );
        }
        if (total != TOTAL_BPS) revert BadShares();
        emit BeneficiariesSet(estateId, commitments.length);
    }

    function _payETH(address to, uint256 amount) internal {
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
