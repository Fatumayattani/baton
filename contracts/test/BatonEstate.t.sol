// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/BatonEstate.sol";
import "../src/MockUSDC.sol";

contract BatonEstateTest is Test {
    BatonEstate baton;
    MockUSDC usdc;

    address owner = makeAddr("owner");
    address guardian = makeAddr("guardian");
    address heirAisha = makeAddr("aisha");
    address heirOmar = makeAddr("omar");
    address stranger = makeAddr("stranger");

    bytes secretAisha = "aisha-super-secret-link-token";
    bytes secretOmar = "omar-super-secret-link-token";

    uint64 constant INTERVAL = 90 days;
    uint64 constant GRACE = 30 days;

    function setUp() public {
        baton = new BatonEstate();
        usdc = new MockUSDC();
        vm.deal(owner, 100 ether);
        usdc.mint(owner, 10_000e6);
    }

    // ------------------------------------------------------------- helpers

    function _createEstate(address g) internal returns (uint256 id) {
        bytes32[] memory commits = new bytes32[](2);
        commits[0] = keccak256(secretAisha);
        commits[1] = keccak256(secretOmar);
        uint16[] memory shares = new uint16[](2);
        shares[0] = 6000; // Aisha 60%
        shares[1] = 4000; // Omar 40%
        vm.prank(owner);
        id = baton.createEstate(INTERVAL, GRACE, g, commits, shares);
    }

    function _fund(uint256 id) internal {
        vm.startPrank(owner);
        baton.depositETH{value: 10 ether}(id);
        usdc.approve(address(baton), 1000e6);
        baton.depositToken(id, address(usdc), 1000e6);
        vm.stopPrank();
    }

    function _expire(uint256 id) internal {
        (,, uint64 last, uint64 interval, uint64 grace,,) = baton.estates(id);
        vm.warp(uint256(last) + interval + grace + 1);
    }

    // ------------------------------------------------------------ creation

    function test_CreateEstate() public {
        uint256 id = _createEstate(address(0));
        (address o,,, uint64 interval, uint64 grace, bool activated, bool cancelled) = baton.estates(id);
        assertEq(o, owner);
        assertEq(interval, INTERVAL);
        assertEq(grace, GRACE);
        assertFalse(activated);
        assertFalse(cancelled);
        assertEq(baton.beneficiaries(id).length, 2);
    }

    function test_RevertWhen_SharesDontTotal100() public {
        bytes32[] memory commits = new bytes32[](2);
        commits[0] = keccak256(secretAisha);
        commits[1] = keccak256(secretOmar);
        uint16[] memory shares = new uint16[](2);
        shares[0] = 6000;
        shares[1] = 3000; // 90% total
        vm.prank(owner);
        vm.expectRevert(BatonEstate.BadShares.selector);
        baton.createEstate(INTERVAL, GRACE, address(0), commits, shares);
    }

    function test_RevertWhen_ZeroInterval() public {
        bytes32[] memory commits = new bytes32[](1);
        commits[0] = keccak256(secretAisha);
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10_000;
        vm.prank(owner);
        vm.expectRevert(BatonEstate.BadIntervals.selector);
        baton.createEstate(0, GRACE, address(0), commits, shares);
    }

    // ------------------------------------------------------- deposits/withdraw

    function test_DepositAndWithdraw() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        assertEq(baton.balances(id, address(0)), 10 ether);
        assertEq(baton.balances(id, address(usdc)), 1000e6);

        vm.prank(owner);
        baton.withdraw(id, address(0), 4 ether, owner);
        assertEq(baton.balances(id, address(0)), 6 ether);
        assertEq(owner.balance, 94 ether);

        vm.prank(owner);
        baton.withdraw(id, address(usdc), 250e6, owner);
        assertEq(usdc.balanceOf(owner), 9250e6);
    }

    function test_RevertWhen_StrangerWithdraws() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        vm.prank(stranger);
        vm.expectRevert(BatonEstate.NotOwner.selector);
        baton.withdraw(id, address(0), 1 ether, stranger);
    }

    // ------------------------------------------------------------ heartbeat

    function test_HeartbeatResetsClock() public {
        uint256 id = _createEstate(address(0));
        vm.warp(block.timestamp + INTERVAL + GRACE - 1 hours); // almost expired
        vm.prank(owner);
        baton.heartbeat(id);
        assertFalse(baton.isExpired(id));
        assertEq(baton.timeRemaining(id), uint256(INTERVAL) + GRACE);
    }

    function test_RevertWhen_StrangerHeartbeats() public {
        uint256 id = _createEstate(address(0));
        vm.prank(stranger);
        vm.expectRevert(BatonEstate.NotOwner.selector);
        baton.heartbeat(id);
    }

    // ----------------------------------------------------------- activation

    function test_RevertWhen_ActivateBeforeExpiry() public {
        uint256 id = _createEstate(address(0));
        vm.expectRevert(BatonEstate.NotYetExpired.selector);
        baton.activateEstate(id);
    }

    function test_PermissionlessActivationAfterExpiry() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        _expire(id);
        vm.prank(stranger); // anyone can activate when no guardian is set
        baton.activateEstate(id);
        (,,,,, bool activated,) = baton.estates(id);
        assertTrue(activated);
        assertEq(baton.snapshots(id, address(0)), 10 ether);
        assertEq(baton.snapshots(id, address(usdc)), 1000e6);
    }

    function test_GuardianGatesActivation() public {
        uint256 id = _createEstate(guardian);
        _fund(id);
        _expire(id);

        vm.prank(stranger);
        vm.expectRevert(BatonEstate.NotGuardian.selector);
        baton.activateEstate(id);

        vm.prank(guardian);
        baton.activateEstate(id);
        (,,,,, bool activated,) = baton.estates(id);
        assertTrue(activated);
    }

    function test_HeartbeatDuringGraceBlocksActivation() public {
        uint256 id = _createEstate(address(0));
        (,, uint64 last,,,,) = baton.estates(id);
        vm.warp(uint256(last) + INTERVAL + 1 days); // inside grace window
        vm.prank(owner);
        baton.heartbeat(id); // owner returns from holiday
        vm.warp(block.timestamp + INTERVAL); // still inside new window
        vm.expectRevert(BatonEstate.NotYetExpired.selector);
        baton.activateEstate(id);
    }

    // --------------------------------------------------------------- claims

    function test_FullClaimFlow() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        _expire(id);
        baton.activateEstate(id);

        vm.prank(heirAisha);
        baton.claim(id, 0, secretAisha);
        assertEq(heirAisha.balance, 6 ether);          // 60% of 10 ETH
        assertEq(usdc.balanceOf(heirAisha), 600e6);    // 60% of 1000 USDC

        vm.prank(heirOmar);
        baton.claim(id, 1, secretOmar);
        assertEq(heirOmar.balance, 4 ether);
        assertEq(usdc.balanceOf(heirOmar), 400e6);

        assertEq(baton.balances(id, address(0)), 0);
        assertEq(baton.balances(id, address(usdc)), 0);
    }

    function test_RevertWhen_ClaimWithWrongSecret() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        _expire(id);
        baton.activateEstate(id);
        vm.prank(stranger);
        vm.expectRevert(BatonEstate.BadCommitment.selector);
        baton.claim(id, 0, "guessing-wrong");
    }

    function test_RevertWhen_DoubleClaim() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        _expire(id);
        baton.activateEstate(id);
        vm.prank(heirAisha);
        baton.claim(id, 0, secretAisha);
        vm.prank(heirAisha);
        vm.expectRevert(BatonEstate.AlreadyClaimed.selector);
        baton.claim(id, 0, secretAisha);
    }

    function test_RevertWhen_ClaimBeforeActivation() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        vm.prank(heirAisha);
        vm.expectRevert(BatonEstate.NotActive.selector);
        baton.claim(id, 0, secretAisha);
    }

    // --------------------------------------------------- revocability paths

    function test_CancelReturnsEverything() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        vm.prank(owner);
        baton.cancelEstate(id);
        assertEq(owner.balance, 100 ether);
        assertEq(usdc.balanceOf(owner), 10_000e6);
        (,,,,,, bool cancelled) = baton.estates(id);
        assertTrue(cancelled);
    }

    function test_RevertWhen_DepositAfterCancel() public {
        uint256 id = _createEstate(address(0));
        vm.prank(owner);
        baton.cancelEstate(id);
        vm.prank(owner);
        vm.expectRevert(BatonEstate.AlreadyCancelled.selector);
        baton.depositETH{value: 1 ether}(id);
    }

    function test_RevertWhen_WithdrawAfterActivation() public {
        uint256 id = _createEstate(address(0));
        _fund(id);
        _expire(id);
        baton.activateEstate(id);
        vm.prank(owner);
        vm.expectRevert(BatonEstate.AlreadyActivated.selector);
        baton.withdraw(id, address(0), 1 ether, owner);
    }

    function test_UpdateBeneficiariesBeforeActivation() public {
        uint256 id = _createEstate(address(0));
        bytes32[] memory commits = new bytes32[](1);
        commits[0] = keccak256("only-heir-now");
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10_000;
        vm.prank(owner);
        baton.setBeneficiaries(id, commits, shares);
        assertEq(baton.beneficiaries(id).length, 1);
    }

    // --------------------------------------------------------- demo timings

    function test_DemoModeTimings() public {
        // 2 minute heartbeat, 1 minute grace: the video schedule
        bytes32[] memory commits = new bytes32[](1);
        commits[0] = keccak256(secretAisha);
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10_000;
        vm.prank(owner);
        uint256 id = baton.createEstate(2 minutes, 1 minutes, address(0), commits, shares);
        vm.prank(owner);
        baton.depositETH{value: 1 ether}(id);

        vm.warp(block.timestamp + 3 minutes + 1);
        baton.activateEstate(id);
        vm.prank(heirAisha);
        baton.claim(id, 0, secretAisha);
        assertEq(heirAisha.balance, 1 ether);
    }
}
