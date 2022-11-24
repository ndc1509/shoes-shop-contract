export class ProductDto {
    product_id: string;
    quantity?: number;
    unit_price?: string;
}

export class OrderedItemsDto {
    items: Item[];
    shipping_price: string;
    total_price: string;
}

export class Item {
    product_id: string;
    quantity: number;
    unit_price: string;
}

export class TxId {
    tx_id: string;
}

export class PromiseResponse {
    success: boolean;
    msg: string;
}
