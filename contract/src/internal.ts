import { assert, near } from "near-sdk-js";
import { ShopContract } from "./contract";
import { TX_STATUS } from "./enum";
import { Product, ProductData, Transaction, TransactionJSON } from "./metadata";
import { restoreItems, restoreTransactionIds, txToTxJson } from "./utils";

function internalSetProduct(
    contract: ShopContract,
    productId: string,
    quantity: number,
    unitPrice: string
) {
    assert(quantity >= 0 && BigInt(unitPrice) >= 0, "Invalid product data");
    const productData: ProductData = {
        quantity: quantity.toString(),
        unitPrice,
    };
    contract.products.set(productId, productData);
}

export function internalAddProduct(
    contract: ShopContract,
    productId: string,
    quantity: number,
    unitPrice: string
) {
    assert(!contract.products.get(productId), "Product already exists");
    internalSetProduct(contract, productId, quantity, unitPrice);
    near.log(`Product ${productId} added`);
}

export function internalUpdateProduct(
    contract: ShopContract,
    productId: string,
    quantity: number,
    unitPrice: string
) {
    assert(contract.products.get(productId), "Product not found");
    internalSetProduct(contract, productId, quantity, unitPrice);
    near.log(`Product ${productId} updated`);
}

export function internalRemoveProduct(
    contract: ShopContract,
    productId: string
) {
    assert(contract.products.get(productId), "Product not found");
    contract.products.remove(productId);
    near.log(`Product ${productId} removed`);
}

export function internalGetProduct(
    contract: ShopContract,
    productId: string
): Product {
    const data = contract.products.get(productId);
    assert(data, "Product not found");
    return {
        id: productId,
        data,
    };
}

export function internalGetAllProducts(contract: ShopContract): Product[] {
    const products: Product[] = contract.products.toArray().map(
        ([id, data]): Product => ({
            id,
            data,
        })
    );
    return products;
}

export function internalSendNEAR(receiverId: string, amount: bigint) {
    assert(amount > 0, "Sending amount must greater than 0");
    assert(
        near.accountBalance() > amount,
        `Not enough balance ${near.accountBalance()} to send ${amount}`
    );
    const promise = near.promiseBatchCreate(receiverId);
    near.promiseBatchActionTransfer(promise, amount);
    near.promiseReturn(promise);
}

export function internalGetTx(
    contract: ShopContract,
    txId: string,
    accountId?: string
) {
    if (accountId) {
        assert(contract.accounts.containsKey(accountId), "Account not found");
        assert(
            contract.accounts.get(accountId).contains(txId),
            "Account does not have the transaction"
        );
    }
    const tx = contract.transactionById.get(txId);
    assert(tx, "Transaction not found");
    return tx;
}

export function internalGetTxsByAccountId(
    contract: ShopContract,
    accountId: string
) {
    assert(contract.accounts.containsKey(accountId), "Account not found");
    const txIds = restoreTransactionIds(
        contract.accounts.get(accountId)
    ).toArray();
    const txsJson = txIds.map((id) => txToTxJson(id, internalGetTx(contract, id)));
    return txsJson;
}

export function internalUpdateTx(
    contract: ShopContract,
    txId: string,
    oldStatus: TX_STATUS,
    newStatus: TX_STATUS,
    accountId?: string
) {
    const tx = internalGetTx(contract, txId, accountId);
    assert(tx.status === oldStatus, `Transaction status must be ${oldStatus}`);
    tx.status = newStatus;
    tx.updatedAt = new Date().toISOString();
    contract.transactionById.set(txId, tx);
    near.log(`Transaction status ${txId} has been updated to ${newStatus}`);
    return tx;
}
