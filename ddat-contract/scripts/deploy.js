const hre = require("hardhat");

async function main() {
  console.log("──────────────────────────────────────────────");
  console.log("  Deploying DDATracker to", hre.network.name);
  console.log("──────────────────────────────────────────────\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address :", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance :", hre.ethers.formatEther(balance), "MATIC\n");

  // Deploy
  const DDATracker = await hre.ethers.getContractFactory("DDATracker");
  const ddaTracker = await DDATracker.deploy();
  await ddaTracker.waitForDeployment();

  const contractAddress = await ddaTracker.getAddress();
  console.log("✅ DDATracker deployed to:", contractAddress);

  // Wait for a few block confirmations before verifying (testnet can be slow)
  if (hre.network.name === "amoy") {
    console.log("\nWaiting for 5 block confirmations...");
    const deployTx = ddaTracker.deploymentTransaction();
    await deployTx.wait(5);

    console.log("Verifying contract on Polygonscan...\n");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("✅ Contract verified on Polygonscan!");
    } catch (error) {
      if (error.message.toLowerCase().includes("already verified")) {
        console.log("Contract is already verified.");
      } else {
        console.error("Verification failed:", error.message);
      }
    }
  }

  console.log("\n──────────────────────────────────────────────");
  console.log("  Deployment complete!");
  console.log("──────────────────────────────────────────────");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
