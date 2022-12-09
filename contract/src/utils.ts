import { assert, near, UnorderedMap, UnorderedSet } from "near-sdk-js";
import { Product, ProductData, Transaction, TransactionJSON } from "./metadata";

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

//Convert serialized data back to an UnorderedSet
export function restoreTransactionIds(collection: UnorderedSet<string>) {
    if (collection == null) return null;
    return UnorderedSet.reconstruct(collection);
}

//Convert serialized data back to an UnorderedMap
export function restoreItems(collection: UnorderedMap<ProductData>) {
    if (collection == null) return null;
    return UnorderedMap.reconstruct(collection);
}

//Check a cross contract call or not
export function assertCrossContractCall() {
    assert(
        near.signerAccountId() != near.predecessorAccountId(),
        "Only for cross-contract call"
    );
}

//Convert a transaction object to json
export function txToTxJson(id: string, tx: Transaction): TransactionJSON {
    const items = restoreItems(tx.items)
        .toArray()
        .map(
            ([productId, productData]): Product => ({
                id: productId,
                data: productData,
            })
        );
    return {
        id,
        buyer: tx.buyer,
        status: tx.status,
        shippingPrice: tx.shippingPrice,
        totalPrice: tx.totalPrice,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        items,
    };
}
