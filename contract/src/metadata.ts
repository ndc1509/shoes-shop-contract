import { UnorderedMap } from "near-sdk-js";
import { TX_STATUS } from "./enum";

export class Product {
    id: string;
    data: ProductData;
}

export class ProductData {
    quantity: string;
    unitPrice: string;
}

export class Transaction {
    status: TX_STATUS;
    buyer: string;
    items: UnorderedMap<ProductData>;
    shippingPrice: string;
    totalPrice: string;
    createdAt: string;
    updatedAt: string;
}
