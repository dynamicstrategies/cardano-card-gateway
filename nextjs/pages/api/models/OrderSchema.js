import { Schema } from "mongoose";

/**
 * Connection between the backend and the MongoDB database is managed through Mongoose.
 * Mongoose has a concept of schemas where you define the fields in the database,
 * their types, default value and if they are mandatory (and potentially other options)
 * For a guide on Mongoose schemas refer to their docs: https://mongoosejs.com/docs/guide.html
 *
 * For our purpose the schema for orders is as defined below.  Note that this schema is only
 * used by NextJS APIs. The Daemon that runs separate from NextJS does not use mongoose
 */

const OrderSchema = new Schema({

    /**
     * The Policy Id of the Asset on the Cardano blockchain
     * Should be something like this as an example:
     * 8b6e03019fe44a02b9197829317a5459cdec357e236c2678289e1c8d
     */
    policyId: {
        type: String,
        required: true
    },

    /**
     * Asset name of the asset on the Cardano blockchain and should
     * be related to the policy Id in the field above. Note that this is
     * not the Hex representation. So should be something like: NeoWindsurfer
     */
    assetName: {
        type: String,
        required: true
    },

    /**
     * Amount of the Asset that is sold each time to the user. This is
     * usually = 1, but can also be larger amounts. A new record is
     * created in the DB and These fields are populated
     * once the button Pay with Card is pressed in the front-end
     */
    amount: {
        type: Number,
        default: 1,
    },

    /**
     * Transaction hash on the EVM blockchain for the transfer of
     * POL tokens from the payment processor (Wert.io) to the smart contract
     * for the Asset that the user purchased. This transaction is tracked
     * by the Daemon and confirms independently that the transaction was
     * indeed made for the right amount
     */
    paymentTxHash: {
        type: String,
        required: false,
        default: ""
    },

    /**
     * Transaction hash on the Cardano blockchain with the transfer of assets from
     * the Hot wallet to the user's Cardano wallet address. This transaction can be
     * monitored on a blockchain indexer such as https://cardanoscan.io/
     */
    orderSentTxHash: {
        type: String,
        required: false,
        default: ""
    },
    /**
     * The Cardano Wallet address of the user making the purchase in the
     * front-end. The Daemon will send the asset to this address on the
     * Cardano blockchain, once the payment is confirmed on the EVM blockchain
     */
    userWalletAddress: {
        type: String,
        required: true
    },

    /**
     * Only the wert method is used in this implementation
     * the field is left in to allow for extension to cover
     * payments in ada, promocodes and other forms
     */
    payMethod: {
        type: String,
        default: "ada",
        enum: ["ada", "fiat", "promocode", "wert"] // fiat stands for Stripe payments
    },
    /**
     * Email address of the user
     * Currently NOT USED
     */
    emailAddr: {
        type: String,
        default: "",
        required: false,
    },

    /**
     * Payment status defines how the Daemon treats the orders.
     * Payments in the paid state will be picked up by the Daemon,
     * then double-checked vs the transaction on the EVM blockchain if
     * the transaction was indeed done with the right smart contract and
     * for the expected amount.
     *
     * Once payment is confirmed then the asset will be sent from the
     * Cardano Hot wallet to the user's wallet
     */
    status: {
        type: String,
        default: "initiated",
        enum: ["initiated", "paid", "sent", "completed", "failed"]
    },
    /**
     * Payment needs to be confirmed by checking if the transaction
     * has been recorded on the EVM chain and for the correct amount
     * Once confirmed then this field is set to true
     */
    paymentConfirmed: {
        type: Boolean,
        default: false,
    },
    /**
     * Holds the address of the EVM contract where payment is sent
     * You should be the operator of this smart contract and should
     * be able to retrieve the payment that is sent there. There is a
     * separate section in the documentation for this part.
     */
    evmContractAddress: {
        type: String,
        default: "",
        required: true
    },
    /**
     * Defines the price in POL tokens on the Polygon
     * blockchain for the Digital Asset that is being sold.
     * This is required as payment will be made in natives tokens
     * into the EVM smart contract
     */
    evmAssetPrice: {
        type: Number,
        default: 0,
        required: true
    },
    /**
     * Which blockchian and network that is used
     * Example: Polygon Amoy or Arbitrum Sepolina for testing
     */
    wertNetwork: {
        type: String,
        default: "",
        required: true
    },
    /**
     * Token on the blockchain that is used for payment
     * Example: POL on Polygon and ETH on Arbitrum
     */
    wertCommodity: {
        type: String,
        default: "",
        required: true
    },
    /**
     * The Daemon runs in a loop and checks the status of the order before
     * proceeding. To keep track how many times an order was checked in its
     * current status this field gets incremented each time
     */
    retries: {
        type: Number,
        default: 0
    },
    /**
     * Date when the transaction was created
     */
    createdDateTime: {
        type: Date,
        required: true
    },

    /**
     * Timestamp of the last action performed on the order in the DB
     * this is useful for debugging
     */
    timestamp: {
        type: Date,
        default: Date.now
    }

});


export default OrderSchema;
