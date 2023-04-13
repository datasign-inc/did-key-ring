# did-key-ring

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

`did-key-ring` is a wrapper library for managing Ethereum account groups using the [MetaMask KeyringController](https://github.com/MetaMask/KeyringController). It extends the functionality by supporting the association and handling of Decentralized Identifiers (DIDs) for each account.

## Installation

To install the `did-key-ring` library, use the following command:

```bash
yarn add did-key-ring
```

## Usage
### Initialize KeyRing
new keyring
```typescript
import { DIDKeyRingController } from "did-key-ring";
const password = "password";
const keyRing = await DIDKeyRingController.newVault(password);
const encryptedVault = keyRing.exportAccount().encryptedVault; // for restore
```

reusing keyring
```typescript
const keyRing = await DIDKeyRingController.restoreVault(encryptedVault);
await keyRing.unlock(password);
```

get secret recovery phrase
```typescript
const secretRecoveryPhrase = await didKeyRing.secretRecoveryPhrase();
```

### Generating a DID
To generate a DID, First, implement the DID issuance process (issueImpl) according to the actual DID method, and then pass it to the keyRing.

ion sample
```typescript
import { DIDIssuer, PublicKeyParams, Service } from "did-key-ring";
import { DID, anchor } from "@decentralized-identity/ion-tools";
import { toPrivateJwk, publicJwkFromPrivate } from "elliptic-jwk";

const issueImpl = async (
    privateKey: string,
    publicKeyParams: PublicKeyParams,
    services?: Service[]
) => {
    const privateJwk = toPrivateJwk(privateKey, "secp256k1");
    const publicKeyJwk = publicJwkFromPrivate(privateJwk);
    const publicKey = { ...publicKeyParams, publicKeyJwk };
    const did = new DID({
        content: {
            publicKeys: [publicKey],
            services: services || [],
        },
    });
    const didState = (await did.getState()) as DIDState;
    const createRequest = await did.generateRequest(0);
    const result = await anchor(createRequest);
    const { shortForm, longForm, ops } = result;
    return { did: longForm, additionalInfo: result };
};
const issuer = didKeyRing.getIssuer(issueImpl);
```
then you can use the methods below:

Master DID
```typescript
const result = await issuer.issueMasterDID({
    id: "key-1",
    type: "JsonWebKey2020",
    purposes: ["authentication"],
});
console.log(result);
// { did: 'did:xxx:123', additionalInfo: {} }
```

Sub DID
```typescript
const result = await issuer.issueSubDID({
    id: "key-1",
    type: "JsonWebKey2020",
    purposes: ["authentication"],
});
console.log(result);
// { did: 'did:xxx:456', additionalInfo: {} }
```

### Getting a DID Private Key
```typescript
const { did } = result
const privateKey = await didKeyRing.getPrivateKey(did);
```

### Restore
export
```typescript
    const exported = await didKeyRing.export();
```

restore
```typescript
const { encryptedVault, issuedDIDs } = exported;
const didKeyRing = await DIDKeyRingController.restoreVault(encryptedVault);
await didKeyRing.unlock(password);
await didKeyRing.restoreDID(issuedDIDs);
```

### Recovery
```typescript
const { issuedDIDs } = exported;
const didKeyRing = await DIDKeyRingController.recover("new-password", secretRecoveryPhrase);
await didKeyRing.restoreDID(issuedDIDs);
```
