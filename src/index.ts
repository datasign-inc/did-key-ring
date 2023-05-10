import {
  Config,
  config,
  DIDAccount,
  DIDIssuer,
  DIDKeyRingController,
  IssueResult,
  PublicKeyParams,
  Service,
} from "./did-key-ring-controller.js";
import { SingleHDKeyRingController } from "./keyRing/SingleHDKeyRingController.js";

export { DIDIssuer, DIDKeyRingController, SingleHDKeyRingController };
export type { DIDAccount, IssueResult, PublicKeyParams, Service };
export const configure = (cfg: Config) => {
  config.issuer = cfg.issuer;
};
