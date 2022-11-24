import { PromiseResponse } from "./index.d";
import { assert, near, UnorderedSet } from "near-sdk-js";

export function assertOneYocto() {
    const deposited = near.attachedDeposit();
    assert(deposited == BigInt(1), "Requires 1 yoctoNEAR");
}

export function assertAtLeastOneYocto() {
    const deposited = near.attachedDeposit();
    assert(deposited >= BigInt(1), "Requires at least 1 yoctoNEAR");
}

export function getPromiseResults(): boolean {
    try {
        const result = near.promiseResult(0);
        near.log("Promise returns: " + result);
        if (!result) throw "Transaction failed";
        return true;
    } catch (e) {
        near.log("Fail");
        return false;
    }
}

export function restoreTransactionIds(collection: UnorderedSet<string>) {
    if (collection == null) return null;
    return UnorderedSet.reconstruct(collection);
}

export function assertCrossContractCall() {
    assert(
        near.signerAccountId() != near.predecessorAccountId(),
        "Only for cross-contract call"
    );
}
