// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DDATracker
 * @notice A decentralized accountability tracker that lets users stake ETH/MATIC
 *         on personal commitments. A verifier can release or forfeit the stake
 *         based on whether the user completed their goal.
 */
contract DDATracker {
    // ─── Structs ────────────────────────────────────────────────────────
    struct Commitment {
        address user;
        string goal;
        uint256 stakeAmount;
        uint256 deadline;
        bool completed;
        bool released;
    }

    // ─── State ──────────────────────────────────────────────────────────
    uint256 public commitmentCount;
    mapping(uint256 => Commitment) public commitments;
    uint256 public forfeitedPoolBalance;

    address public owner;

    // ─── Events ─────────────────────────────────────────────────────────
    event CommitmentCreated(
        uint256 indexed commitmentId,
        address indexed user,
        string goal,
        uint256 stakeAmount,
        uint256 deadline
    );

    event ProofSubmitted(
        uint256 indexed commitmentId,
        address indexed user
    );

    event CommitmentVerified(
        uint256 indexed commitmentId,
        bool success,
        uint256 stakeAmount
    );

    event ForfeitedPoolCredited(
        uint256 indexed commitmentId,
        uint256 amount,
        uint256 newPoolBalance
    );

    event ForfeitedPoolWithdrawn(
        address indexed to,
        uint256 amount,
        string purpose,
        uint256 remainingPoolBalance
    );

    // ─── Modifiers ──────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "DDATracker: caller is not the owner");
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Core Functions ─────────────────────────────────────────────────

    /**
     * @notice Create a new commitment by staking native currency.
     * @param _goal  A description of the goal the user wants to achieve.
     * @param _durationInSeconds  How many seconds from now until the deadline.
     */
    function createCommitment(
        string calldata _goal,
        uint256 _durationInSeconds
    ) external payable {
        require(msg.value > 0, "DDATracker: stake must be greater than 0");
        require(
            _durationInSeconds > 0,
            "DDATracker: duration must be greater than 0"
        );
        require(
            bytes(_goal).length > 0,
            "DDATracker: goal cannot be empty"
        );

        uint256 commitmentId = commitmentCount;
        commitmentCount++;

        commitments[commitmentId] = Commitment({
            user: msg.sender,
            goal: _goal,
            stakeAmount: msg.value,
            deadline: block.timestamp + _durationInSeconds,
            completed: false,
            released: false
        });

        emit CommitmentCreated(
            commitmentId,
            msg.sender,
            _goal,
            msg.value,
            block.timestamp + _durationInSeconds
        );
    }

    /**
     * @notice Submit proof that the commitment has been completed.
     *         Can only be called by the commitment owner before the deadline.
     * @param _commitmentId  The ID of the commitment.
     */
    function submitProof(uint256 _commitmentId) external {
        Commitment storage c = commitments[_commitmentId];

        require(c.user != address(0), "DDATracker: commitment does not exist");
        require(
            msg.sender == c.user,
            "DDATracker: only the commitment owner can submit proof"
        );
        require(!c.completed, "DDATracker: proof already submitted");
        require(!c.released, "DDATracker: stake already released");
        require(
            block.timestamp <= c.deadline,
            "DDATracker: deadline has passed"
        );

        c.completed = true;

        emit ProofSubmitted(_commitmentId, msg.sender);
    }

    /**
     * @notice Verify the commitment and release or keep the stake.
     *         Only the contract owner (verifier) can call this.
     * @param _commitmentId  The ID of the commitment to verify.
     * @param _success       True to return the stake; false to forfeit it.
     */
    function verifyAndRelease(
        uint256 _commitmentId,
        bool _success
    ) external onlyOwner {
        Commitment storage c = commitments[_commitmentId];

        require(c.user != address(0), "DDATracker: commitment does not exist");
        require(!c.released, "DDATracker: stake already released");
        require(c.completed, "DDATracker: proof not yet submitted");

        c.released = true;

        if (_success) {
            // Return stake to the user
            (bool sent, ) = payable(c.user).call{value: c.stakeAmount}("");
            require(sent, "DDATracker: failed to send stake back");
        } else {
            // Track forfeited stake in a dedicated pool for later usage.
            forfeitedPoolBalance += c.stakeAmount;
            emit ForfeitedPoolCredited(
                _commitmentId,
                c.stakeAmount,
                forfeitedPoolBalance
            );
        }

        emit CommitmentVerified(_commitmentId, _success, c.stakeAmount);
    }

    /**
     * @notice Read full details of a commitment.
     * @param _commitmentId  The ID of the commitment.
     * @return user         The address that created the commitment.
     * @return goal         The goal description.
     * @return stakeAmount  The amount of native currency staked.
     * @return deadline     The UNIX timestamp of the deadline.
     * @return completed    Whether proof has been submitted.
     * @return released     Whether the stake has been released / forfeited.
     */
    function getCommitment(
        uint256 _commitmentId
    )
        external
        view
        returns (
            address user,
            string memory goal,
            uint256 stakeAmount,
            uint256 deadline,
            bool completed,
            bool released
        )
    {
        Commitment storage c = commitments[_commitmentId];
        require(c.user != address(0), "DDATracker: commitment does not exist");

        return (
            c.user,
            c.goal,
            c.stakeAmount,
            c.deadline,
            c.completed,
            c.released
        );
    }

    // ─── Admin Helpers ──────────────────────────────────────────────────

    /**
     * @notice Withdraw forfeited stakes from the contract.
     *         Only the owner can call this.
     * @param _to     Address to send the funds to.
     * @param _amount Amount to withdraw (in wei).
     */
    function withdrawForfeitedStakes(
        address payable _to,
        uint256 _amount
    ) external onlyOwner {
        _withdrawForfeitedPoolFunds(_to, _amount, "general");
    }

    /**
     * @notice Withdraw funds from the forfeited pool with a usage label.
     *         Examples: rewards, ops, grants, personal.
     * @param _to      Address to send the funds to.
     * @param _amount  Amount to withdraw (in wei).
     * @param _purpose Free-form reason label for this transfer.
     */
    function withdrawForfeitedPoolFunds(
        address payable _to,
        uint256 _amount,
        string calldata _purpose
    ) external onlyOwner {
        _withdrawForfeitedPoolFunds(_to, _amount, _purpose);
    }

    function _withdrawForfeitedPoolFunds(
        address payable _to,
        uint256 _amount,
        string memory _purpose
    ) internal {
        require(_to != address(0), "DDATracker: invalid recipient");
        require(
            forfeitedPoolBalance >= _amount,
            "DDATracker: insufficient forfeited pool balance"
        );

        forfeitedPoolBalance -= _amount;
        (bool sent, ) = _to.call{value: _amount}("");
        require(sent, "DDATracker: withdrawal failed");

        emit ForfeitedPoolWithdrawn(
            _to,
            _amount,
            _purpose,
            forfeitedPoolBalance
        );
    }

    /**
     * @notice Check current forfeited pool balance.
     */
    function getForfeitedPoolBalance() external view returns (uint256) {
        return forfeitedPoolBalance;
    }

    /**
     * @notice Check the contract's current balance.
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Allow the contract to receive native currency directly
    receive() external payable {}
}
