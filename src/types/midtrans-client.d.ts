declare module 'midtrans-client' {
    interface SnapConfig {
        isProduction: boolean;
        serverKey: string;
        clientKey: string;
    }

    interface TransactionDetails {
        order_id: string;
        gross_amount: number;
    }

    interface ItemDetails {
        id: string;
        price: number;
        quantity: number;
        name: string;
    }

    interface CustomerDetails {
        email?: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
    }

    interface Callbacks {
        finish?: string;
        error?: string;
        pending?: string;
    }

    interface SnapTransaction {
        transaction_details: TransactionDetails;
        item_details?: ItemDetails[];
        customer_details?: CustomerDetails;
        callbacks?: Callbacks;
        custom_field1?: string;
        custom_field2?: string;
        custom_field3?: string;
    }

    interface SnapResult {
        token: string;
        redirect_url: string;
    }

    interface TransactionStatus {
        order_id: string;
        transaction_status: string;
        fraud_status?: string;
        gross_amount: string;
        payment_type?: string;
        transaction_time?: string;
        status_code?: string;
        signature_key?: string;
    }

    class Snap {
        constructor(config: SnapConfig);
        createTransaction(transaction: SnapTransaction): Promise<SnapResult>;
    }

    class CoreApi {
        constructor(config: SnapConfig);
        transaction: {
            status(orderId: string): Promise<TransactionStatus>;
        };
    }

    const midtransClient: {
        Snap: typeof Snap;
        CoreApi: typeof CoreApi;
    };

    export default midtransClient;
}
