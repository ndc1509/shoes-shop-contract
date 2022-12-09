import {
    call,
    initialize,
    LookupMap,
    NearBindgen,
    UnorderedMap,
    UnorderedSet,
    view,
} from "near-sdk-js";
import { ProductDto } from ".";
// import { internalGetFtRate, internalGetWallet } from "./ft_view";
import { OrderedItemsDto, TxId } from "./index.d";
import {
    internalAddProduct,
    internalGetAllProducts,
    internalGetProduct,
    internalGetTxsByAccountId,
    internalRemoveProduct,
    internalUpdateProduct,
} from "./internal";
import { ProductData, Transaction } from "./metadata";
import { internalRegister, internalResolveRegister } from "./registration";
import {
    internalCancelOrder,
    internalConfirmComplete,
    internalConfirmOrder,
    internalCreateOrder,
    internalResolveCancelOrder,
    internalResolveCreateOrder,
} from "./shop_core";
import { assertOneYocto } from "./utils";

@NearBindgen({})
export class ShopContract {
    ft_contract: string;
    owner_id: string;
    products: UnorderedMap<ProductData>; //<ProductId, ProductData>
    accounts: LookupMap<UnorderedSet<string>>; //<AccountId, TransactionId[]>
    depositById: LookupMap<bigint>; //<AccountId, depositAmount>
    transactionById: UnorderedMap<Transaction>; // <TX_ID, Transaction>
    nextTransactionId: number;

    constructor() {
        this.ft_contract = "";
        this.owner_id = "";
        this.products = new UnorderedMap("p");
        this.accounts = new LookupMap("a");
        this.transactionById = new UnorderedMap("t");
        this.depositById = new LookupMap("d");
        this.nextTransactionId = 0;
    }

    @initialize({})
    init({ owner_id, ft_contract }: { owner_id: string; ft_contract: string }) {
        this.owner_id = owner_id;
        this.ft_contract = ft_contract;
    }

    //Product management
    @call({ privateFunction: true })
    add_product({ product_id, quantity, unit_price }: ProductDto) {
        internalAddProduct(this, product_id, quantity, unit_price);
    }

    @call({ privateFunction: true })
    update_product({ product_id, quantity, unit_price }: ProductDto) {
        internalUpdateProduct(this, product_id, quantity, unit_price);
    }

    @call({ privateFunction: true })
    remove_product({ product_id }: ProductDto) {
        internalRemoveProduct(this, product_id);
    }

    //Product view methods
    @view({})
    get_product({ product_id }: ProductDto) {
        return JSON.stringify(internalGetProduct(this, product_id));
    }

    @view({})
    get_all_products() {
        return JSON.stringify(internalGetAllProducts(this));
    }

    @view({})
    get_products({ product_ids }: { product_ids: string[] }) {
        return JSON.stringify(
            product_ids.map((id) => internalGetProduct(this, id))
        );
    }

    //Registration
    @call({ payableFunction: true })
    register_call() {
        internalRegister(this);
    }

    @call({ privateFunction: true })
    resolve_register({ deposited }: { deposited: string }) {
        internalResolveRegister(this, deposited);
    }

    // @call({ payableFunction: true })
    // unregister({ id }: { id: string }) {
    //     this.accounts.remove(id);
    // }

    //Create order
    @call({ payableFunction: true })
    create_order_call({ items, shipping_price }: OrderedItemsDto) {
        assertOneYocto();
        internalCreateOrder(this, items, shipping_price);
    }

    @call({ privateFunction: true })
    resolve_create_order({
        items,
        shipping_price,
        total_price,
    }: OrderedItemsDto) {
        internalResolveCreateOrder(this, items, shipping_price, total_price);
    }

    //Cancel order
    @call({ payableFunction: true })
    cancel_order_call({ tx_id }: TxId) {
        assertOneYocto();
        internalCancelOrder(this, tx_id);
    }

    @call({ privateFunction: true })
    resolve_cancel_order({ tx_id }: TxId) {
        internalResolveCancelOrder(this, tx_id);
    }

    //Transfer order to buyer
    @call({ privateFunction: true })
    confirm_order({ tx_id }: TxId) {
        internalConfirmOrder(this, tx_id);
    }

    //Buyer confirms to receive ordered items
    @call({ payableFunction: true })
    confirm_complete({ tx_id }: TxId) {
        assertOneYocto();
        internalConfirmComplete(this, tx_id);
    }

    @view({})
    get_txs_of({ account_id }: { account_id: string }) {
        return JSON.stringify(internalGetTxsByAccountId(this, account_id));
    }

    @view({})
    check_account({ account_id }: { account_id: string }) {
        if (this.owner_id === account_id) {
            return {
                success: true,
                msg: "admin",
            };
        }
        const success = this.accounts.containsKey(account_id);
        return {
            success,
            msg: success ? "Account registered" : "Account not found",
        };
    }
}
