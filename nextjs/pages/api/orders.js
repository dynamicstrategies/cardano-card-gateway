/**
 * This API point accepts POST request from the front end and deals
 * with writing new orders to the DB and updating the status of existing orders
 *
 * The list of available methods are:
 * - "neworder" - create a new order in the database when a user
 * presses Pay with Card in the frontend
 * - "get_status" - to get the status of the current order. This is
 * used in the front end to update the user of their payment and order
 * delivery status
 * - "get_senttxhash" - to get the hash of the transaction on the
 * Cardano blockchain that shows the digital asset being sent to the user's
 * wallet. This transaction is sent by the backend daemon once it
 * confirms that the payment has been received in the smart contract from Wert.io
 */

import mongoose from "mongoose";
import OrderSchema from "./models/OrderSchema";

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DB = process.env.MONGODB_DB;
const ASSET_POL_PRICE = process.env.ASSET_POL_PRICE;
const EVM_SC_ADDRESS = process.env.EVM_SC_ADDRESS;

const DB_URL = `${MONGODB_URL}/${MONGODB_DB}`;

let connection;
try {
    connection = mongoose.createConnection(DB_URL,{maxPoolSize: 10});
    console.log('new DB connection established')
} catch(err) {
    console.log(err)
}


const handle = async (req, res) => {

    let result;
    let statusCode;


    //###############
    // POST methods #
    //###############

    if (req.method === "POST") {

        // console.log(req.body)
        const Order = connection.model('Order', OrderSchema);

        /**
         * Back end API to process new orders from the front-end
         * The majority of the parameters comes from the front-end
         * and then it is complemented by 2 parameteres from
         * the environment variables:
         * - Price in Pol tokens
         * - Address of the EVM smart contract into which
         * the payment is sent
         */
        if (req.body?.purpose === "neworder" ) {
            const {
                policyId,
                assetName,
                amount,
                paymentTxHash,
                userWalletAddress,
                payMethod,
                status,
            } = req.body;

            const timestamp = Date.now();

            const priceInPol = ASSET_POL_PRICE;
            const evmContractAddress = EVM_SC_ADDRESS;

            const orderDict = {
                policyId,
                assetName,
                amount,
                paymentTxHash,
                userWalletAddress,
                payMethod,
                status,
                createdDateTime: timestamp,
                timestamp,
                evmContractAddress,
                priceInPol,
            }


            try {

                // save the utxo to DB
                const orderDoc = new Order(orderDict);
                result = await orderDoc.save();
                statusCode = 201;

            } catch (err) {
                console.error(err);
                statusCode = 500;
            }

            // console.log("--- ticket id")
            // console.log(result._id.toString())

        } else if (req.body?.purpose === "get_status") {

            const orderId = req.body?.orderId;

            console.log("--- get status on orderId")
            console.log(orderId)

            try {
                result = await Order.findById(orderId, 'status').exec();
                console.log("--- checking order status from front-end ---")
                // console.log(result)
                statusCode = 200;
            } catch (err) {
                result = err;
                statusCode = 500;
            }

        } else if (req.body?.purpose === "get_senttxhash") {

            const orderId = req.body?.orderId;

            // console.log("--- orderId")
            // console.log(orderId)

            try {
                result = await Order.findById(orderId, 'orderSentTxHash').exec();
                // console.log(result)
                statusCode = 200;
            } catch (err) {
                result = err;
                statusCode = 500;
            }

        // } else if (req.body?.purpose === "updatetxhash" ) {
        //
        //     const {
        //         orderId,
        //         paymentTxHash
        //     } = req.body;
        //
        //     const timestamp = Date.now();
        //     const update = {paymentTxHash, timestamp}
        //
        //     try {
        //         const doc = await Order.findByIdAndUpdate(orderId, update)
        //         // console.log(result)
        //         statusCode = 200;
        //         result = doc;
        //     } catch (err) {
        //         console.log(err)
        //         result = err;
        //         statusCode = 500;
        //     }

        // } else if (req.body?.purpose === "updateemail" ) {
        //
        //     const {
        //         orderId,
        //         emailAddr
        //     } = req.body;
        //
        //     const timestamp = Date.now();
        //     const update = {emailAddr, timestamp}
        //
        //     try {
        //         const doc = await Order.findByIdAndUpdate(orderId, update)
        //         // console.log(result)
        //         statusCode = 200;
        //         result = doc;
        //     } catch (err) {
        //         console.log(err)
        //         result = err;
        //         statusCode = 500;
        //     }

        }


        res.status(statusCode).json(result);

    }

    //###############
    // GET methods #
    //###############
    if (req.method === "GET") {

        const Order = connection.model('Order', OrderSchema);

        const params = JSON.parse(req.query[0])

        if (Object.keys(req.query).length && params?.what === "status" && params?.orderId) {

            // TODO: deprecated

        } else if (Object.keys(req.query).length && params?.what === "senttxhash" && params?.orderId) {

            // TODO: deprecated

        } else if (Object.keys(req.query).length && params?.what === "numticketssold") {

            // TODO: deprecated

        } else if (Object.keys(req.query).length && params?.what === "numticketssoldMulti") {

            // TODO: deprecated

        } else if (Object.keys(req.query).length && params?.what === "numticketsremaining") {

            // TODO: deprecated

        } else {
            statusCode = 500;
            result = "incorrect request";
            // res.status(500).json("incorrect request");
        }

        res.status(statusCode).json(result);

    }

}

export default handle;
