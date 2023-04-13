import { SingleHDKeyRingController } from "./keyRing/SingleHDKeyRingController.js";

type Purpose = "authentication" | "keyAgreement";
export interface PublicKeyParams {
  id: string;
  type: "JsonWebKey2020";
  purposes: Purpose[];
}
export interface Service {
  id: string;
  type: string;
  serviceEndpoint: string | { [key: string]: string | string[] };
}
interface Opts {
  accountName?: string;
  services?: Service[];
}

export interface IssueResult<T = object> {
  did: string;
  additionalInfo?: T;
}
export type DIDIssuer<T = object> = (
  privateKey: string,
  publicKeyParams: PublicKeyParams,
  services?: Service[]
) => Promise<IssueResult<T>>;
// export type DIDIssuer<T = object> = (
//   keyRing: DIDKeyRingController,
//   publicKeyParams: PublicKeyParams,
//   services?: Service[]
// ) => Promise<IssueResult<T>>;

export interface Config {
  issuer?: DIDIssuer;
}
export const config: Config = {};

export const MASTER_ACCOUNT_NAME = "Master Account";

export interface DIDAccount {
  did: string;
  address: string;
  accountName: string;
  issuedAt: string;
  additionalInfo?: any;
}

const DEFAULT_OPTS = { accountName: undefined, services: undefined };

class Issuer<T> {
  constructor(
    private keyRing: DIDKeyRingController,
    private didIssuer: DIDIssuer<T>
  ) {}
  public async issueMasterDID(publicKeyParam: PublicKeyParams, opts?: Opts) {
    const { accountName, services } = opts || DEFAULT_OPTS;
    const { privateKey, address } = await this.keyRing.getMasterAccount();
    const result = await this.didIssuer(privateKey, publicKeyParam, services);
    this.keyRing.issueDID2(result, address, accountName);
    return result;
  }
  public async issueSubDID(publicKeyParam: PublicKeyParams, opts?: Opts) {
    const { accountName, services } = opts || DEFAULT_OPTS;
    const { privateKey, address } = await this.keyRing._addAccount();
    const result = await this.didIssuer(privateKey, publicKeyParam, services);
    this.keyRing.issueDID2(result, address, accountName);
    return result;
  }
}
export class DIDKeyRingController {
  private didAddressMap: { [key: string]: string } = {};
  private didAccounts: DIDAccount[] = [];
  // private didIssuer?: DIDIssuer;

  constructor(
    private keyRingController: SingleHDKeyRingController,
    private encryptedVault: string
  ) {}

  static async newVault(password: string) {
    const keyRingController = new SingleHDKeyRingController();
    await keyRingController.createNewVault(password);
    return new DIDKeyRingController(
      keyRingController,
      keyRingController.encryptedVault
    );
  }
  static async restoreVault(encryptedVault: string) {
    const initState = { vault: encryptedVault };
    const keyRingController = new SingleHDKeyRingController({ initState });
    return new DIDKeyRingController(keyRingController, encryptedVault);
  }
  static async recover(newPassword: string, secretRecoveryPhrase: string) {
    const keyRingController = new SingleHDKeyRingController();
    await keyRingController.restore("new-password", secretRecoveryPhrase);
    return new DIDKeyRingController(
      keyRingController,
      keyRingController.encryptedVault
    );
  }
  public async secretRecoveryPhrase() {
    return await this.keyRingController.getSeedPhrase();
  }
  public getAddress(did: string) {
    return this.didAddressMap[did];
  }
  public getAccount(index = 0) {
    return this.didAccounts[index];
  }
  public exportAccount<T = object>() {
    return {
      encryptedVault: this.encryptedVault,
      issuedDIDs: [...this.didAccounts] as (Omit<
        DIDAccount,
        "additionalInfo"
      > & {
        additionalInfo: T;
      })[],
    };
  }
  public getPrivateKey(did: string) {
    return this.keyRingController.getPrivateKey(this.didAddressMap[did]);
  }
  // public setIssuer(issuer: DIDIssuer) {
  //   this.didIssuer = issuer;
  // }
  public getIssuer<T>(issuer: DIDIssuer<T>) {
    return new Issuer<T>(this, issuer);
  }
  public async getMasterAccount() {
    const addresses = await this.keyRingController.getAccounts();
    const address = addresses[0];
    const privateKey = await this.keyRingController.getPrivateKey(address);
    return { privateKey, address };
  }
  public async _addAccount() {
    const address = await this.keyRingController.addAccount();
    const privateKey = await this.keyRingController.getPrivateKey(address);
    return { privateKey, address };
  }
  // public async issueMasterDID(publicKeyParams: PublicKeyParams, opts?: Opts) {
  //   const { accountName, services } = opts || DEFAULT_OPTS;
  //   const addresses = await this.keyRingController.getAccounts();
  //   const address = addresses[0];
  //   const result = await this.issueDID(address, publicKeyParams, {
  //     accountName: accountName || MASTER_ACCOUNT_NAME,
  //     services,
  //   });
  //   return result;
  // }
  // public async issuePairwiseDID(publicKeyParams: PublicKeyParams, opts?: Opts) {
  //   const address = await this.keyRingController.addAccount();
  //   const result = await this.issueDID(address, publicKeyParams, opts);
  //   return result;
  // }
  // public async issueDID<T>(
  //   didIssuer: DIDIssuer<T>,
  //   address: string,
  //   publicKeyParams: PublicKeyParams,
  //   opts?: Opts
  // ) {
  //   const { accountName, services } = opts || DEFAULT_OPTS;
  //   const privateKey = await this.keyRingController.getPrivateKey(address);
  //   // const { issuer } = config;
  //   const result = await didIssuer(this, publicKeyParams, services);
  //   // const result = await this.didIssuer!(privateKey, publicKeyParams, services);
  //   const { did, additionalInfo } = result;
  //   this.didAddressMap[did] = address;
  //   this.didAccounts.push({
  //     did,
  //     address,
  //     accountName: accountName || "",
  //     issuedAt: new Date().toISOString(),
  //     additionalInfo,
  //   });
  //   return result;
  // }
  public issueDID2<T>(
    result: IssueResult<T>,
    address: string,
    accountName?: string
  ) {
    const { did, additionalInfo } = result;
    this.didAddressMap[did] = address;
    this.didAccounts.push({
      did,
      address,
      accountName: accountName || "",
      issuedAt: new Date().toISOString(),
      additionalInfo,
    });
    return result;
  }
  public async unlock(password: string) {
    await this.keyRingController.unlock(password);
  }
  public get isUnlock() {
    return this.keyRingController.isUnlocked;
  }
  public async restoreDID(issuedDIDs: DIDAccount[]) {
    if (!this.keyRingController.isUnlocked) {
      throw new Error("the vault is locked");
    }
    const addresses = await this.keyRingController.getAccounts();
    /*
      | address length | did length | case                                | behavior                                    |
      | -------------- | ---------- | ----------------------------------- | ------------------------------------------- |
      | 1              | 1          | master account only                 |  get all addresses(= 1 master account)      |
      | 1              | n (gte 2)  | initial vault and latest did length | reproduce sub-account and get all addresses |
      | n (gte 2)      | n (gte 2)  | the latest vault and latest did length  | get all addresses                       |
      | m (gte 2)      | n (gte 2)  | un-match state                      | throe error                                 |
     */
    if (1 < addresses.length && addresses.length !== issuedDIDs.length) {
      throw new Error(
        "encryptedVault state and issuedDID length does not match."
      );
    }
    const dids: { [key: string]: string } = {};
    if (addresses.length === issuedDIDs.length) {
      for (let i = 0; i < issuedDIDs.length; i++) {
        const { did, address, ...rest } = issuedDIDs[i];
        if (address !== addresses[i]) {
          console.error(issuedDIDs);
          throw new Error("invalid exported data provided");
        }
        dids[did] = address;
        this.didAccounts.push({ did, address, ...rest });
      }
    } else {
      const { did, address, ...rest } = issuedDIDs[0];
      dids[did] = address;
      this.didAccounts.push({ did, address, ...rest });
      for (let i = 1; i < issuedDIDs.length; i++) {
        const { did, address, ...rest } = issuedDIDs[i];
        const reproducedAddress = await this.keyRingController.addAccount(); // re-produce sub-accounts
        if (address !== reproducedAddress) {
          console.error(issuedDIDs);
          throw new Error("invalid exported data provided");
        }
        dids[did] = address;
        this.didAccounts.push({ did, address, ...rest });
      }
    }
    this.didAddressMap = dids;
  }
}
