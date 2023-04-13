import { SingleHDKeyRingController } from "../src/keyRing/SingleHDKeyRingController";

const testPassword = "test-password";

describe("Single Account", () => {
  let initState = { vault: "" };

  beforeAll(async () => {
    const fn = jest.fn(async (address) => {
      expect(address).toBeTruthy();
      const privateKey = await keyRingController.getPrivateKey(address);
      expect(privateKey).toBeTruthy();
    });
    const keyRingController = new SingleHDKeyRingController();
    keyRingController.onNewVault(fn);

    await keyRingController.createNewVault(testPassword);
    expect(fn.mock.calls.length).toBe(1);

    const addresses = await keyRingController.getAccounts();
    expect(addresses.length).toBe(1);

    initState.vault = keyRingController.encryptedVault;
    expect(initState.vault).toBeTruthy();
  });

  test("succeeded to unlock vault", async () => {
    const keyRingController = new SingleHDKeyRingController({ initState });
    await keyRingController.unlock(testPassword);
    expect(keyRingController.isUnlocked).toBeTruthy();

    await keyRingController.lock();
    expect(keyRingController.isUnlocked).toBeFalsy();
  });

  test("failed to unlock vault", async () => {
    const keyRingController = new SingleHDKeyRingController({ initState });
    await keyRingController.unlock("wrong-password");
    expect(keyRingController.isUnlocked).toBeFalsy();
  });

  test("add account", async () => {
    const keyRingController = new SingleHDKeyRingController({ initState });
    await keyRingController.unlock(testPassword);
    const address = await keyRingController.addAccount();
    const privateKey = await keyRingController.getPrivateKey(address);
    expect(privateKey).toBeTruthy();
    // const ev = keyRingController.encryptedVault;
    // const keyRingController2 = new SingleHDKeyRingController({
    //   initState: { vault: ev },
    // });
    // await keyRingController2.unlock(testPassword);
    // const addr = await keyRingController2.getAccounts();
    // console.log(addr);
  });

  test("get seed phrase", async () => {
    const keyRingController = new SingleHDKeyRingController({ initState });
    await keyRingController.unlock(testPassword);
    const seedPhrase = await keyRingController.getSeedPhrase();
    expect(seedPhrase).toBeTruthy();
  });
});

describe("Multiple Account", () => {
  let initState = { vault: "" };
  beforeAll(async () => {
    const keyRingController = new SingleHDKeyRingController();

    await keyRingController.createNewVault(testPassword);
    await keyRingController.addAccount();

    initState.vault = keyRingController.encryptedVault;
    expect(initState.vault).toBeTruthy();
  });
  test("get accounts", async () => {
    const keyRingController = new SingleHDKeyRingController({ initState });
    await keyRingController.unlock(testPassword);
    const addresses = await keyRingController.getAccounts();
    expect(addresses.length).toBe(2);
  });
});

describe("Restore", () => {
  let seedPhrase = "";
  let originalAddress1 = "";
  let originalAddress2 = "";
  beforeAll(async () => {
    const keyRingController = new SingleHDKeyRingController();
    await keyRingController.createNewVault(testPassword);
    await keyRingController.addAccount(); // second account

    seedPhrase = await keyRingController.getSeedPhrase();

    const addresses = await keyRingController.getAccounts();
    expect(addresses.length).toBe(2);
    originalAddress1 = addresses[0];
    originalAddress2 = addresses[1];
  });

  test("restore", async () => {
    const keyRingController = new SingleHDKeyRingController();
    await keyRingController.restore("new-password", seedPhrase);

    let addresses = await keyRingController.getAccounts();
    expect(addresses.length).toBe(1);
    expect(addresses[0]).toBe(originalAddress1);

    // restore second account
    await keyRingController.addAccount();
    addresses = await keyRingController.getAccounts();
    expect(addresses.length).toBe(2);
    expect(addresses[1]).toBe(originalAddress2);
  });
});
