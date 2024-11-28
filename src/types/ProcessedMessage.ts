import type { Address } from "abitype";
import type { Hex } from "./Hex.js";

/**
 * The structure representing a processed message.
 *
 * @export
 * @typedef {ProcessedMessage}
 */
export type ProcessedMessage = {
  success: boolean;
  data: Hex;
  blockHash: Hex;
  blockNumber: number;
  from: Address;
  gasUsed: bigint;
  feeCredit: bigint;
  hash: Hex;
  seqno: bigint;
  to: Address;
  refundTo: Address;
  bounceTo: Address;
  index?: number;
  value: bigint;
  signature: Hex;
};
