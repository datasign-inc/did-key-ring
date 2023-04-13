import {
  DIDKeyRingController,
  DIDIssuer,
  MASTER_ACCOUNT_NAME,
} from "../src/did-key-ring-controller";
import { SingleHDKeyRingController } from "../src/keyRing/SingleHDKeyRingController";

const recoveredAddresses = async (
  secretRecoveryPhrase: string,
  subCount: number = 0
) => {
  const keyRingController = new SingleHDKeyRingController();
  await keyRingController.restore("new-password", secretRecoveryPhrase);
  for (let i = 0; i < subCount; i++) {
    await keyRingController.addAccount();
  }
  return await keyRingController.getAccounts();
};
describe("did-key-ring", () => {
  let ev = "";
  let srp = "";
  const password = "test-password";
  beforeAll(async () => {
    const didKeyRing = await DIDKeyRingController.newVault(password);
    const exported = didKeyRing.exportAccount();
    ev = exported.encryptedVault;
    srp = await didKeyRing.secretRecoveryPhrase();
  });
  test("issue master did", async () => {
    const addresses = await recoveredAddresses(srp);
    const did1 = "did1";
    const didKeyRing = await DIDKeyRingController.restoreVault(ev);
    await didKeyRing.unlock(password);
    const issueImpl: DIDIssuer = async (
      privateKey,
      publicKeyParams,
      services
    ) => {
      return { did: did1 };
    };
    const issuer = didKeyRing.getIssuer(issueImpl);
    const result = await issuer.issueMasterDID({
      id: "key-1",
      type: "JsonWebKey2020",
      purposes: ["authentication"],
    });
    expect(didKeyRing.getAddress(result.did)).toBe(addresses[0]);
    expect(result.did).toBe(did1);

    const exported = didKeyRing.exportAccount<string>();
    expect(exported.issuedDIDs.length).toBe(1);

    // export then restore
    const didKeyRing2 = await DIDKeyRingController.restoreVault(ev);
    await didKeyRing2.unlock(password);
    await didKeyRing2.restoreDID(exported.issuedDIDs);
    const address = didKeyRing2.getAddress(did1);
    expect(address).toBe(addresses[0]);
  });
  test("issue pairwise did account", async () => {
    const addresses = await recoveredAddresses(srp, 1);
    const did1 = "did1";
    const did2 = "did2";
    const didKeyRing = await DIDKeyRingController.restoreVault(ev);
    await didKeyRing.unlock(password);
    await didKeyRing.restoreDID([
      {
        did: did1,
        address: addresses[0],
        accountName: MASTER_ACCOUNT_NAME,
        issuedAt: new Date().toISOString(),
      },
    ]);
    const issueImpl: DIDIssuer = async (
      privateKey,
      publicKeyParams,
      services
    ) => {
      return { did: did2 };
    };
    const issuer = didKeyRing.getIssuer(issueImpl);
    const issued = await issuer.issueSubDID({
      id: "key-1",
      type: "JsonWebKey2020",
      purposes: ["authentication"],
    });
    expect(didKeyRing.getAddress(issued.did)).toBe(addresses[1]);
    expect(issued.did).toBe(did2);

    const exported = didKeyRing.exportAccount();
    expect(exported.issuedDIDs.length).toBe(2);

    // export then restore
    const didKeyRing2 = await DIDKeyRingController.restoreVault(ev);
    await didKeyRing2.unlock(password);
    await didKeyRing2.restoreDID(exported.issuedDIDs);
    const address1 = didKeyRing2.getAddress(did1);
    const address2 = didKeyRing2.getAddress(did2);
    expect(address1).toBe(addresses[0]);
    expect(address2).toBe(addresses[1]);
  });
  test("recover by secret recovery phrase", async () => {
    const addresses = await recoveredAddresses(srp, 1);
    const did1 = "did1";
    const did2 = "did2";
    const didKeyRing = await DIDKeyRingController.recover("new-password", srp);
    await didKeyRing.restoreDID([
      {
        did: did1,
        address: addresses[0],
        accountName: MASTER_ACCOUNT_NAME,
        issuedAt: new Date().toISOString(),
      },
      {
        did: did2,
        address: addresses[1],
        accountName: "",
        issuedAt: new Date().toISOString(),
      },
    ]);
    const address1 = didKeyRing.getAddress(did1);
    const address2 = didKeyRing.getAddress(did2);
    expect(address1).toBe(addresses[0]);
    expect(address2).toBe(addresses[1]);

    const exported = didKeyRing.exportAccount();
    expect(exported.issuedDIDs.length).toBe(2);
  });
});
