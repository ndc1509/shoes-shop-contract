// import { near, bytes } from 'near-sdk-js';
// import { ShopContract } from './contract';
// export function internalGetFtRate(contract: ShopContract) {
//     const promise = near.promiseBatchCreate(contract.ft_contract);
//     near.promiseBatchActionFunctionCall(
//         promise,
//         "ft_rate",
//         bytes(JSON.stringify({})),
//         0,
//         100_000_000_000_000
//     );
//     near.promiseReturn(promise);
//     return near.promiseResult(promise);
// }

// export function internalGetWallet(contract: ShopContract) {
//     const promise = near.promiseBatchCreate(contract.ft_contract);
//     near.promiseBatchActionFunctionCall(
//         promise,
//         "ft_balance_of",
//         bytes(JSON.stringify({account_id: near.predecessorAccountId()})),
//         0,
//         100_000_000_000_000
//     );
//     near.promiseReturn(promise);
//     return near.promiseResult(promise);
// }