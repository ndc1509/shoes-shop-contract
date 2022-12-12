import { assert, bytes, near, UnorderedMap } from "near-sdk-js";
import { Item } from ".";
import { ShopContract } from "./contract";
import { GAS, TX_STATUS } from "./enum";
import { internalGetTx, internalSendNEAR, internalUpdateTx } from "./internal";
import { ProductData, Transaction } from "./metadata";
import {
    getPromiseResults,
    restoreItems,
    restoreTransactionIds,
} from "./utils";

export function internalCreateOrder(
    contract: ShopContract,
    items: Item[],
    shippingPrice: string
) {
    const buyer = near.predecessorAccountId();
    assert(contract.accounts.containsKey(buyer), "Account not found");
    //Check order details and calculate total price
    let totalPrice = BigInt(shippingPrice);
    items.forEach((item) => {
        //Check product exists
        const productId = item.product_id;
        const productStock = contract.products.get(productId);
        assert(productStock, "Product not found");
        //Check ordered quantity
        assert(item.quantity > 0, "Invalid item quantity");
        assert(
            Number(productStock.quantity) >= item.quantity,
            `Not enough product ${productId} in stock`
        );
        //Check price is changed or not
        assert(
            productStock.unitPrice === item.unit_price,
            `Product ${productId}'s price has been changed`
        );
        //Add to total price
        totalPrice += BigInt(item.quantity) * BigInt(item.unit_price);
        //Update stock
        productStock.quantity = (
            Number(productStock.quantity) - item.quantity
        ).toString();
        contract.products.set(productId, productStock);
    });
    const promise = near.promiseBatchCreate(contract.ft_contract);
    near.promiseBatchActionFunctionCall(
        promise,
        "ft_on_purchase",
        bytes(
            JSON.stringify({
                amount: totalPrice.toString(),
                memo: `Transfer for transaction ${
                    contract.nextTransactionId
                } of ${near.currentAccountId()}'s contract`,
            })
        ),
        1,
        GAS.FT_ON_TRANSFER
    );
    near.promiseThen(
        promise,
        near.currentAccountId(),
        "resolve_create_order",
        bytes(
            JSON.stringify({
                items,
                shipping_price: shippingPrice,
                total_price: totalPrice.toString(),
            })
        ),
        0,
        GAS.RESOLVE_CREATE_ORDER
    );
    return near.promiseReturn(promise);
}

export function internalResolveCreateOrder(
    contract: ShopContract,
    items: Item[],
    shippingPrice: string,
    totalPrice: string
) {
    const response = getPromiseResults();
    if (!response) {
        //Revert
        items.forEach((item) => {
            const productId = item.product_id;
            const productStock = contract.products.get(productId);
            productStock.quantity = (
                Number(productStock.quantity) + item.quantity
            ).toString();
            contract.products.set(productId, productStock);
        });
        return false;
    }
    const buyer = near.signerAccountId();
    //Insert new transaction to transactionById
    const txId = contract.nextTransactionId.toString();
    const itemSet: UnorderedMap<ProductData> = new UnorderedMap(
        "i" + txId.toString()
    );
    items.forEach((item) => {
        const itemData: ProductData = {
            quantity: item.quantity.toString(),
            unitPrice: item.unit_price,
        };
        itemSet.set(item.product_id, itemData);
    });
    const tx: Transaction = {
        status: TX_STATUS.PENDING,
        buyer,
        items: itemSet,
        shippingPrice,
        totalPrice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    contract.transactionById.set(txId, tx);
    //Insert txId to accounts
    const buyerTxList = restoreTransactionIds(contract.accounts.get(buyer));
    buyerTxList.set(txId);
    contract.accounts.set(buyer, buyerTxList);
    //Update nextTransactionId
    contract.nextTransactionId += 1;
    return true;
}

export function internalCancelOrder(contract: ShopContract, txId: string) {
    const buyerId = near.predecessorAccountId();
    const tx = internalUpdateTx(
        contract,
        txId,
        TX_STATUS.PENDING,
        TX_STATUS.CANCELED,
        buyerId
    );
    const promise = near.promiseBatchCreate(contract.ft_contract);
    near.promiseBatchActionFunctionCall(
        promise,
        "ft_on_refund",
        bytes(
            JSON.stringify({
                amount: tx.totalPrice,
                memo: `Refund for transaction ${txId} of ${near.currentAccountId()}'s contract`,
            })
        ),
        1,
        GAS.FT_ON_REFUND
    );
    near.promiseThen(
        promise,
        near.currentAccountId(),
        "resolve_cancel_order",
        bytes(JSON.stringify({ tx_id: txId })),
        0,
        GAS.RESOLVE_CANCEL_ORDER
    );
    return near.promiseReturn(promise);
}

export function internalResolveCancelOrder(
    contract: ShopContract,
    txId: string
) {
    const response = getPromiseResults();
    if (!response) {
        //Revert
        internalUpdateTx(contract, txId, TX_STATUS.CANCELED, TX_STATUS.PENDING);
        return false;
    }
    //Update product stock
    const tx = internalGetTx(contract, txId);
    const items = restoreItems(tx.items).toArray();
    items.forEach(([id, data]) => {
        const productId = id;
        const productStock = contract.products.get(productId);
        productStock.quantity = (
            Number(productStock.quantity) + data.quantity
        ).toString();
        contract.products.set(productId, productStock);
    });
    return true;
}

export function internalConfirmOrder(contract: ShopContract, txId: string) {
    internalUpdateTx(contract, txId, TX_STATUS.PENDING, TX_STATUS.TRANSFERRING);
}

export function internalConfirmComplete(contract: ShopContract, txId: string) {
    const buyerId = near.predecessorAccountId();
    internalUpdateTx(
        contract,
        txId,
        TX_STATUS.TRANSFERRING,
        TX_STATUS.SUCCESS,
        buyerId
    );
}
