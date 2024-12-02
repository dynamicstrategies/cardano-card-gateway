import mongoose from "mongoose";
import OrderSchema from "./models/OrderSchema";
import axios from "axios";

// const TICKET_WALLET_ID = process.env.TICKET_WALLET_ID
const TICKET_WALLET_ID = "abc123456"
const WALLET_API_URL = process.env.WALLET_API_URL
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


/**
 * API handles calls from Web page
 *
 */
const handle = async (req, res) => {

    let result;
    let statusCode;


    // console.log(req)



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


            const ticketPolicyId = params?.ticketPolicyId;
            const ticketAssetName = params?.ticketAssetName;

            // console.log(ticketPolicyId)
            // console.log(ticketAssetName)

            const filter = {
                $and: [
                    {$or: [{status: 'sent'}, {status: 'completed'}]},
                    {$and: [{ticketPolicyId: ticketPolicyId}, {ticketAssetName: ticketAssetName}]}
                ]
            }

            // const filter = {
            //     ticketPolicyId: ticketPolicyId
            // }

            try {
                result = await Order.countDocuments(filter);
                // console.log(result)
                statusCode = 200;
            } catch (err) {
                result = err;
                statusCode = 500;
            }
        } else if (Object.keys(req.query).length && params?.what === "numticketssoldMulti") {

            const ticketPolicyIds = params?.ticketPolicyIds;
            const ticketAssetNames = params?.ticketAssetNames;

            // console.log(ticketPolicyId)
            // console.log(ticketAssetName)

            const filter = [
                {$match: {
                    $and: [
                        {$or: [{status: 'sent'}, {status: 'completed'}]},
                        {$and: [{ticketPolicyId: {$in: ticketPolicyIds}}, {ticketAssetName: {$in: ticketAssetNames}}]}
                    ]
                }},
                {$group: {_id: {ticketPolicyId: "$ticketPolicyId", ticketAssetName: "$ticketAssetName"}, count: {$sum: 1}}}
            ]

            // const filter = {
            //     ticketPolicyId: ticketPolicyId
            // }

            try {
                result = await Order.aggregate(filter);
                // console.log(result)
                statusCode = 200;
            } catch (err) {
                statusCode = 500;
                console.log(`--- error fetching numticketsremaining, status code ${statusCode}`)
                console.log(err)
                result = err;
            }
        } else if (Object.keys(req.query).length && params?.what === "numticketsremaining") {

            const ticketPolicyId = params?.ticketPolicyId;
            const ticketAssetName = params?.ticketAssetName;
            const ticketAssetNameHex = Buffer.from(ticketAssetName, "utf8").toString("hex");

            try {

                const response = await axios({
                    method: 'get',
                    url: `/wallets/${TICKET_WALLET_ID}/utxo`,
                    baseURL: WALLET_API_URL,
                    headers: {'Content-Type': 'application/json'},
                })

                if (response.status === 200) {


                    // console.log("--- numticketsremaining")
                    // console.log(response)

                    const entries = response.data?.entries || [];
                    let assetAmount = undefined;
                    for (const x of entries) {
                        if (!x.assets.length) continue
                        for (const a of x.assets) {
                            if (a.asset_name === ticketAssetNameHex && a.policy_id === ticketPolicyId) {
                                if (!assetAmount) assetAmount = 0;
                                assetAmount += a.quantity;
                            }
                        }
                    }

                    result = assetAmount;
                    statusCode = 200

                } else {
                    console.log("--- error fetching numticketsremaining, status code not 200")
                    console.error(response)
                    result = response;
                    statusCode = response.status;
                }

            } catch(err) {
                statusCode = 500;
                console.log(`--- error fetching numticketsremaining, status code ${statusCode}`)
                console.log(err)
                result = err;

            }


        } else {
            statusCode = 500;
            result = "incorrect request";
            // res.status(500).json("incorrect request");
        }

        res.status(statusCode).json(result);

    }



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
            let results = {};

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

        } else if (req.body?.purpose === "updatetxhash" ) {

            const {
                orderId,
                paymentTxHash
            } = req.body;

            const timestamp = Date.now();
            const update = {paymentTxHash, timestamp}

            try {
                const doc = await Order.findByIdAndUpdate(orderId, update)
                // console.log(result)
                statusCode = 200;
                result = doc;
            } catch (err) {
                console.log(err)
                result = err;
                statusCode = 500;
            }

        } else if (req.body?.purpose === "updateemail" ) {

            const {
                orderId,
                emailAddr
            } = req.body;

            const timestamp = Date.now();
            const update = {emailAddr, timestamp}

            try {
                const doc = await Order.findByIdAndUpdate(orderId, update)
                // console.log(result)
                statusCode = 200;
                result = doc;
            } catch (err) {
                console.log(err)
                result = err;
                statusCode = 500;
            }

        }



        res.status(statusCode).json(result);

    }

}

export default handle;
