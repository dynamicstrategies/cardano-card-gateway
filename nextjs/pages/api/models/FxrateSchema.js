import { Schema } from "mongoose";

/**
 * The FXrates table holds the exchange rates between crypto tokens
 * and USD. The payment processor handling card payment quotes the client
 * the purchase value in USD, while paying the equivalent amount
 * of blockchain native currency into the smart contract (that can later
 * be withdrawn). The exchange rate between the native currency and
 * USD is constantly changing and this table holds the most up-to-date
 * exchange rate so the price in USD that is shown to the client is
 * similar to what the payment processor will charge
 *
 */

const FxrateSchema = new Schema({

    baseCcy: {
        type: String,
        required: true
    },
    counterCcy: {
        type: String,
        required: true
    },
    pair: {
        type: String,
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }

});


export default FxrateSchema;
