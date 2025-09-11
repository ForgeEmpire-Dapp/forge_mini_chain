/**
 * Simplified tx module for tests
 */
import crypto from "node:crypto";

export function signTx(tx, chainId, privateKey, publicKey, algorithm) {
  // Simplified signing for tests
  const payload = JSON.stringify(tx, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
  const hash = "0x" + crypto.createHash("sha256").update(payload).digest("hex");
  
  return {
    tx,
    signature: "0x" + crypto.randomBytes(64).toString("hex"), // Mock signature
    hash,
    algorithm: algorithm || "ed25519"
  };
}