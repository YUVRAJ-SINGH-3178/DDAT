const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("DDATracker", function () {
  // ── Fixture ──────────────────────────────────────────────────────────
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    const DDATracker = await ethers.getContractFactory("DDATracker");
    const tracker = await DDATracker.deploy();
    await tracker.waitForDeployment();
    return { tracker, owner, user1, user2 };
  }

  // ── Deployment ───────────────────────────────────────────────────────
  describe("Deployment", function () {
    it("Should set the deployer as owner", async function () {
      const { tracker, owner } = await loadFixture(deployFixture);
      expect(await tracker.owner()).to.equal(owner.address);
    });

    it("Should start with zero commitments", async function () {
      const { tracker } = await loadFixture(deployFixture);
      expect(await tracker.commitmentCount()).to.equal(0);
    });
  });

  // ── createCommitment ─────────────────────────────────────────────────
  describe("createCommitment", function () {
    it("Should create a commitment with correct details", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("1.0");
      const duration = 86400; // 1 day

      await tracker
        .connect(user1)
        .createCommitment("Run 5km every day", duration, { value: stake });

      const c = await tracker.getCommitment(0);
      expect(c.user).to.equal(user1.address);
      expect(c.goal).to.equal("Run 5km every day");
      expect(c.stakeAmount).to.equal(stake);
      expect(c.completed).to.be.false;
      expect(c.released).to.be.false;
    });

    it("Should emit CommitmentCreated event", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("0.5");

      await expect(
        tracker
          .connect(user1)
          .createCommitment("Read 30 pages", 3600, { value: stake })
      )
        .to.emit(tracker, "CommitmentCreated")
        .withArgs(0, user1.address, "Read 30 pages", stake, (v) => v > 0n);
    });

    it("Should revert if stake is zero", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await expect(
        tracker.connect(user1).createCommitment("Goal", 3600, { value: 0 })
      ).to.be.revertedWith("DDATracker: stake must be greater than 0");
    });

    it("Should revert if duration is zero", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await expect(
        tracker
          .connect(user1)
          .createCommitment("Goal", 0, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("DDATracker: duration must be greater than 0");
    });

    it("Should revert if goal is empty", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await expect(
        tracker
          .connect(user1)
          .createCommitment("", 3600, { value: ethers.parseEther("1") })
      ).to.be.revertedWith("DDATracker: goal cannot be empty");
    });

    it("Should increment commitmentCount", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("0.1");

      await tracker
        .connect(user1)
        .createCommitment("Goal 1", 3600, { value: stake });
      await tracker
        .connect(user1)
        .createCommitment("Goal 2", 7200, { value: stake });

      expect(await tracker.commitmentCount()).to.equal(2);
    });
  });

  // ── submitProof ──────────────────────────────────────────────────────
  describe("submitProof", function () {
    it("Should mark commitment as completed", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, {
          value: ethers.parseEther("1"),
        });

      await tracker.connect(user1).submitProof(0);
      const c = await tracker.getCommitment(0);
      expect(c.completed).to.be.true;
    });

    it("Should emit ProofSubmitted event", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, {
          value: ethers.parseEther("1"),
        });

      await expect(tracker.connect(user1).submitProof(0))
        .to.emit(tracker, "ProofSubmitted")
        .withArgs(0, user1.address);
    });

    it("Should revert if caller is not the commitment owner", async function () {
      const { tracker, user1, user2 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, {
          value: ethers.parseEther("1"),
        });

      await expect(
        tracker.connect(user2).submitProof(0)
      ).to.be.revertedWith(
        "DDATracker: only the commitment owner can submit proof"
      );
    });

    it("Should revert if deadline has passed", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 3600, {
          value: ethers.parseEther("1"),
        });

      await time.increase(3601);

      await expect(
        tracker.connect(user1).submitProof(0)
      ).to.be.revertedWith("DDATracker: deadline has passed");
    });

    it("Should revert if proof already submitted", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, {
          value: ethers.parseEther("1"),
        });
      await tracker.connect(user1).submitProof(0);

      await expect(
        tracker.connect(user1).submitProof(0)
      ).to.be.revertedWith("DDATracker: proof already submitted");
    });
  });

  // ── verifyAndRelease ─────────────────────────────────────────────────
  describe("verifyAndRelease", function () {
    it("Should send stake back on success", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("2.0");

      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, { value: stake });
      await tracker.connect(user1).submitProof(0);

      await expect(
        tracker.connect(owner).verifyAndRelease(0, true)
      ).to.changeEtherBalance(user1, stake);
    });

    it("Should keep stake in contract on failure", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("1.0");

      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, { value: stake });
      await tracker.connect(user1).submitProof(0);

      await expect(
        tracker.connect(owner).verifyAndRelease(0, false)
      ).to.changeEtherBalance(user1, 0);

      // Contract still holds the stake
      expect(await tracker.getContractBalance()).to.equal(stake);
      expect(await tracker.getForfeitedPoolBalance()).to.equal(stake);
    });

    it("Should emit CommitmentVerified event", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("1.0");

      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, { value: stake });
      await tracker.connect(user1).submitProof(0);

      await expect(tracker.connect(owner).verifyAndRelease(0, true))
        .to.emit(tracker, "CommitmentVerified")
        .withArgs(0, true, stake);
    });

    it("Should revert if called by non-owner", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, {
          value: ethers.parseEther("1"),
        });
      await tracker.connect(user1).submitProof(0);

      await expect(
        tracker.connect(user1).verifyAndRelease(0, true)
      ).to.be.revertedWith("DDATracker: caller is not the owner");
    });

    it("Should revert if proof not submitted", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, {
          value: ethers.parseEther("1"),
        });

      await expect(
        tracker.connect(owner).verifyAndRelease(0, true)
      ).to.be.revertedWith("DDATracker: proof not yet submitted");
    });

    it("Should revert if stake already released", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, {
          value: ethers.parseEther("1"),
        });
      await tracker.connect(user1).submitProof(0);
      await tracker.connect(owner).verifyAndRelease(0, true);

      await expect(
        tracker.connect(owner).verifyAndRelease(0, true)
      ).to.be.revertedWith("DDATracker: stake already released");
    });
  });

  // ── getCommitment ────────────────────────────────────────────────────
  describe("getCommitment", function () {
    it("Should return correct commitment details", async function () {
      const { tracker, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("1.5");

      await tracker
        .connect(user1)
        .createCommitment("Meditate daily", 604800, { value: stake });

      const c = await tracker.getCommitment(0);
      expect(c.user).to.equal(user1.address);
      expect(c.goal).to.equal("Meditate daily");
      expect(c.stakeAmount).to.equal(stake);
      expect(c.completed).to.be.false;
      expect(c.released).to.be.false;
    });

    it("Should revert for non-existent commitment", async function () {
      const { tracker } = await loadFixture(deployFixture);
      await expect(tracker.getCommitment(999)).to.be.revertedWith(
        "DDATracker: commitment does not exist"
      );
    });
  });

  // ── Admin helpers ────────────────────────────────────────────────────
  describe("withdrawForfeitedStakes", function () {
    it("Should allow owner to withdraw forfeited funds", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("1.0");

      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, { value: stake });
      await tracker.connect(user1).submitProof(0);
      await tracker.connect(owner).verifyAndRelease(0, false);

      await expect(
        tracker
          .connect(owner)
          .withdrawForfeitedStakes(owner.address, stake)
      ).to.changeEtherBalance(owner, stake);

      expect(await tracker.getForfeitedPoolBalance()).to.equal(0);
    });

    it("Should prevent withdrawing more than forfeited pool", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("1.0");

      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, { value: stake });
      await tracker.connect(user1).submitProof(0);
      await tracker.connect(owner).verifyAndRelease(0, false);

      await expect(
        tracker
          .connect(owner)
          .withdrawForfeitedStakes(owner.address, ethers.parseEther("1.1"))
      ).to.be.revertedWith("DDATracker: insufficient forfeited pool balance");
    });

    it("Should allow tagged withdrawals for custom usage", async function () {
      const { tracker, owner, user1 } = await loadFixture(deployFixture);
      const stake = ethers.parseEther("1.0");
      const rewardAmount = ethers.parseEther("0.25");

      await tracker
        .connect(user1)
        .createCommitment("Goal", 86400, { value: stake });
      await tracker.connect(user1).submitProof(0);
      await tracker.connect(owner).verifyAndRelease(0, false);

      await expect(
        tracker
          .connect(owner)
          .withdrawForfeitedPoolFunds(owner.address, rewardAmount, "rewards")
      ).to.changeEtherBalance(owner, rewardAmount);

      expect(await tracker.getForfeitedPoolBalance()).to.equal(
        stake - rewardAmount
      );
    });
  });
});
