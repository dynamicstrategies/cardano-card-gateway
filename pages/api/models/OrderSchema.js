import { Schema } from "mongoose";

const OrderSchema = new Schema({

    /*
    Event is uniquely identified by:
    - policyId and
    - assetname
     */
    policyId: {
        type: String,
        required: true
    },
    assetName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        default: 1,
    },
    paymentTxHash: {
        type: String,
        required: false,
        default: ""
    },
    orderSentTxHash: {
        type: String,
        required: false,
        default: ""
    },
    userWalletAddress: {
        type: String,
        required: true
    },
    /*
    1 - ada
    2 - fiat
    3 - promo code
     */
    payMethod: {
        type: String,
        default: "ada",
        enum: ["ada", "fiat", "promocode", "wert"] // fiat stands for Stripe payments
    },
    emailAddr: {
        type: String,
        default: "",
        required: false,
    },
    /*
    1 - initiated
    2 - sent
    3 - completed
     */
    status: {
        type: String,
        default: "initiated",
        enum: ["initiated", "paid", "sent", "completed", "failed"]
    },
    retries: {
        type: Number,
        default: 0
    },
    createdDateTime: {
        type: Date,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }

});


export default OrderSchema;
