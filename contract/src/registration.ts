import { assert, bytes, near, UnorderedSet } from "near-sdk-js";
import { ShopContract } from "./contract";
import { GAS } from "./enum";
import { internalSendNEAR } from "./internal";
import { getPromiseResults } from "./utils";

export function internalRegister(contract: ShopContract) {
    const accountId = near.predecessorAccountId();
    assert(
        !contract.accounts.containsKey(accountId),
        "Account is already registered"
    );

    const attachedDeposit = near.attachedDeposit();
    const initialStorage = near.storageUsage();
    let transactions: UnorderedSet<string> = new UnorderedSet("t" + accountId);
    contract.accounts.set(accountId, transactions);
    contract.depositById.set(accountId, BigInt(0));
    const requiredDeposit =
        (near.storageUsage() - initialStorage) * near.storageByteCost();
    contract.depositById.set(accountId, BigInt(requiredDeposit));

    assert(
        attachedDeposit > requiredDeposit,
        "Not enough deposit for register_call"
    );

    const promise = near.promiseBatchCreate(contract.ft_contract);
    near.promiseBatchActionFunctionCall(
        promise,
        "ft_on_register",
        bytes(JSON.stringify({})),
        attachedDeposit - requiredDeposit,
        GAS.FT_ON_REGISTER
    );
    near.promiseThen(
        promise,
        near.currentAccountId(),
        "resolve_register",
        bytes(JSON.stringify({ deposited: attachedDeposit.toString() })),
        0,
        GAS.RESOLVE_REGISTER
    );
    return near.promiseReturn(promise);
}

export function internalResolveRegister(
    contract: ShopContract,
    deposited: string
) {
    const response = getPromiseResults();
    if (!response) {
        //Revert and refund
        const accountId = near.signerAccountId();
        if (contract.accounts.containsKey(accountId)) {
            contract.accounts.remove(accountId);
            contract.depositById.remove(accountId);
            internalSendNEAR(accountId, BigInt(deposited));
        }
        return false;
    }
    return true;
}
