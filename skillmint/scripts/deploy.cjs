const hre = require("hardhat");

/**
 * Deploy order:
 *   1. SkillRegistry  (no dependencies)
 *   2. SkillPayment   (needs registry + treasury)
 *   3. SkillLicense   (needs registry + treasury)
 *   4. Wire contracts: registry.setPaymentContract + registry.setLicenseContract
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const treasury   = deployer.address; // use deployer as treasury for hackathon demo

  console.log("Deploying with:", deployer.address);
  console.log("Treasury:      ", treasury);
  console.log("Network:       ", hre.network.name);
  console.log("─".repeat(50));

  // 1. SkillRegistry
  const Registry = await hre.ethers.getContractFactory("SkillRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();
  console.log("SkillRegistry  →", registryAddr);

  // 2. SkillPayment
  const Payment = await hre.ethers.getContractFactory("SkillPayment");
  const payment = await Payment.deploy(registryAddr, treasury);
  await payment.waitForDeployment();
  const paymentAddr = await payment.getAddress();
  console.log("SkillPayment   →", paymentAddr);

  // 3. SkillLicense
  const License = await hre.ethers.getContractFactory("SkillLicense");
  const license = await License.deploy(registryAddr, treasury);
  await license.waitForDeployment();
  const licenseAddr = await license.getAddress();
  console.log("SkillLicense   →", licenseAddr);

  // 4. Wire
  console.log("─".repeat(50));
  console.log("Wiring contracts...");

  const tx1 = await registry.setPaymentContract(paymentAddr);
  await tx1.wait();
  console.log("✓ setPaymentContract");

  const tx2 = await registry.setLicenseContract(licenseAddr);
  await tx2.wait();
  console.log("✓ setLicenseContract");

  // 5. Output .env snippet
  console.log("\n─".repeat(50));
  console.log("Add to your .env:\n");
  console.log(`REGISTRY_ADDRESS=${registryAddr}`);
  console.log(`PAYMENT_ADDRESS=${paymentAddr}`);
  console.log(`LICENSE_ADDRESS=${licenseAddr}`);
  console.log(`TREASURY_ADDRESS=${treasury}`);
  console.log(`NETWORK=fuji`);
  console.log("─".repeat(50));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
