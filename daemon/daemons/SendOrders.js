/**
 * This Daemon is responsible for monitoring payments and sending assets
 * on the Cardano Network. It is organized in 5 steps:
 *
 * 1 - Initialize connections to the database, connect to a Cardano blockchain
 * indexed (e.g. Koios https://koios.rest/) and set-up a wallet from where to
 * send transactions. This is very much prep work
 *
 * 2 - Check that payment has been received for the assets. This is done by
 * checking periodically (e.g. every 5 seconds) the status of all orders
 * that have been registered in the database
 *
 * 3 -
 */
require('dotenv').config()
const { MongoClient } = require('mongodb');
const {KoiosProvider, MeshWallet, Transaction, MeshTxBuilder} = require("@meshsdk/core");
const {truncate} = require("../utils");
const {ethers} = require("ethers");

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DB = process.env.MONGODB_DB;
const HOT_WALLET_ADDRESS = process.env.HOT_WALLET_ADDRESS
const HOT_WALLET_PRVKEY = process.env.HOT_WALLET_PRVKEY
const NETWORK = process.env.NETWORK
const EVM_RPC = process.env.EVM_RPC

const truncAddress = truncate(HOT_WALLET_ADDRESS, 25, "..")

console.table({
    MONGODB_URL,
    MONGODB_DB,
    truncAddress,
    NETWORK,
    EVM_RPC
})

/**
 * How many milliseconds to look back in time
 * when processing newly created orders
 */

const MAX_LOOKBACK_MS = 24*60*60*1000; // 24h


/************************
 connect to the database
 */
const uri = MONGODB_URL || 'mongodb://cardgateway.work.gd:27048';
const dbName = MONGODB_DB || 'cgateway';

const client = new MongoClient(uri);

let db;
let orders;
let blockchainProvider;
let walletObj;
let evmProvider;


/**
 * Connect to the DB that stores the status of all orders
 * this DB is used extensively in the rest of the code
 */
connectToDB = async () => {
    try {
        await client.connect();
        db = client.db(dbName);
        orders = db.collection('orders');
    } catch (err) {
        console.log(err)
        throw err;
    }
};

connectToDB();



initHotWallet = async () => {

    blockchainProvider = new KoiosProvider(NETWORK);
    const networkId = NETWORK === "preview" ? "0" : NETWORK === "preprod" ? "0" : "1"

    walletObj = new MeshWallet({
        networkId,
        fetcher: blockchainProvider,
        submitter: blockchainProvider,
        key: {
            type: 'root',
            bech32: HOT_WALLET_PRVKEY,
        },
    });

}


initHotWallet();


initEvmProvider = async () => {

    evmProvider = new ethers.JsonRpcProvider(EVM_RPC);

}

initEvmProvider();


/*
Order status has 4 stages:
- initiated - when the user has requested the ticket
- paid - when user paid for the ticket and payment has arrived
- sent - when the ticket has been sent to the user + collateral
- delivered - when the tickets + collateral has been delivered

The script monitors for each of the above stages
It sends the ticket only when payment has been received
 */


const findOrders = async (withStatus, limit) => {

    const query = {
        status: withStatus,
        createdDateTime : {"$gt" : new Date(Date.now() - MAX_LOOKBACK_MS) }
    }
    // const options = {
    //     sort: {timestamp: 1}
    // }

    try {
        const docs = await orders.find(query).limit(limit).sort({timestamp: 1})
        const docsArr = docs.toArray();
        // console.log(doc)
        return docsArr
    } catch (err) {
        console.log(err)
        throw err
    }

}



const updateStatusToPaymentConfirmed = async (orderIdObj) => {

    const query = {_id: orderIdObj}
    const options = {
        $set: {
            paymentConfirmed: true,
            timestamp: new Date(),
            retries: 0
        }
    }

    try {
        const doc = await orders.updateOne(query, options)
        // console.log(doc)
        return doc
    } catch (err) {
        console.log(err)
        throw err
    }
}

const updateStatusToSent = async (orderIdObj, txHash) => {

    const query = {_id: orderIdObj}
    const options = {
        $set: {
            status: 'sent',
            orderSentTxHash: txHash,
            timestamp: new Date(),
            retries: 0
        }
    }

    try {
        const doc = await orders.updateOne(query, options)
        // console.log(doc)
        return doc
    } catch (err) {
        console.log(err)
        throw err
    }
}

const updateStatusToCompleted = async (orderIdObj) => {

    const query = {_id: orderIdObj}
    const options = {
        $set: {
            status: 'completed',
            timestamp: new Date(),
            retries: 0
        }
    }

    try {
        const doc = await orders.updateOne(query, options)
        // console.log(doc)
        return doc
    } catch (err) {
        console.log(err)
        throw err
    }
}


const checkTxHashOnBlockchain = async (txHash) => {


    try {

        const response = await blockchainProvider.fetchTxInfo(txHash);
        const slotN = response?.slot || undefined

        if (slotN) {
            console.log(`Tx ${txHash} included in the slot ${slotN}`);
            return true
        } else {
            console.log(`Tx ${txHash} not yet on the blockchain`)
            return false
        }

    } catch (err) {
        if (err = "[]") {
            console.log(`Tx ${txHash} not yet on the blockchain`)
            return false
        } else {
           throw err
        }

    }

}


const incrementRetries = async (orderIdObj) => {

    const query = {_id: orderIdObj}
    const options = {
        $inc: {retries: 1},
        $set: {timestamp: new Date()}
    }

    try {
        const doc = await orders.updateOne(query, options)
        // console.log(doc)
        return doc
    } catch (err) {
        console.log(err)
        throw err
    }

}


/**************************************
 1 - Check that payment has been received
 *************************************/
const checkForPaymentReceived = async () => {

    let docs;


    try {
        docs = await findOrders('paid', 99999);
    } catch (err) {
        console.log(err);
        throw err;
    }

    if (!docs || !docs.length) {
        console.log("paid order queue is empty")
        return
    }

    for (const doc of docs) {
        const orderIdObj = doc._id;
        const orderIdStr = orderIdObj.toString();

        // console.log("--- checkForDeliveredTickets")
        // console.log(doc);

        const txHash = doc?.paymentTxHash;
        // console.log(`paymentTxHash: ${txHash}`)

        if (!txHash) {
            const retries = doc.retries;
            console.log(`1 - no payment hash for order: ${orderIdStr} , retries: ${retries}`)
            await incrementRetries(orderIdObj);
            continue
        }

        /**
        * Check if payment received:
        * - on blockchain if was a payment in ada
        * - in payment provider if was with fiat
         */
        let isPaymentSuccess = false;
        const payMethod = doc.payMethod;


        if (payMethod === "wert") {

            try {
                const evmTx = await evmProvider.getTransaction(txHash);
                const evmContractAddress = doc?.evmContractAddress;
                const priceInPol = doc?.priceInPol;

                /**
                 * Check that the payment was made to the correct EVM contract
                 * and that they pay amount was of at least the price that
                 * was expected
                 */
                if (
                    evmTx.value >= priceInPol * 1e18 &&
                    evmTx.to &&
                    evmContractAddress.toLowerCase() === evmTx.to.toLowerCase()
                ) {
                    isPaymentSuccess = true
                }

            } catch (err) {
                console.error(err)
            }

        }

        /**
         * Only progress if payment has been confirmed on the EVM
         * blockchain, otherwise repeat the check again
         */
        if (!isPaymentSuccess) {

            const retries = doc.retries;
            console.log(`1 - waiting for EVM payment confirmation on orderId: ${orderIdStr} retries: ${retries}`)

            await incrementRetries(orderIdObj);
            continue
        }

        /**
         * Gets to this stage only if payment has been confirmed
         * in the previous step
         */
        try {
            const paidStatus = await updateStatusToPaymentConfirmed(orderIdObj);
            console.log(`1 - EVM chain payment confirmed: ${orderIdStr}`)
            // console.log("--- paymentStatus");
            // console.log(paidStatus);
        } catch (err) {
            console.log(err);
            // throw err;
        }
    }

}

/**************************************
 2 - Send the ticket to user
 *************************************/
const sendOrder = async () => {

    /*
    Find a ticket in the queue
     */
    let docs;

    try {
        docs = await findOrders('paid', 1);
    } catch (err) {
        console.log(err);
        throw err;
    }


    if (!docs || !docs.length) {
        // console.log("paid queue - empty")
        return
    }

    const doc = docs[0];

    const orderIdObj = doc._id
    const orderIdStr = orderIdObj.toString();

    /*
    Send a ticket
     */
    const assetNameHex = Buffer.from(doc.assetName, "utf8").toString("hex");
    const {userWalletAddress, policyId, amount} = doc

    let txBuilder;

    /**
     * Build the transaction to send Asset from the Hot wallet
     * The transaction is built using MeshJS
     */
    try {

        txBuilder = new MeshTxBuilder({
            fetcher: blockchainProvider,
            submitter: blockchainProvider,
            verbose: false,
        });

        const assetsArr = [{
            unit: `${policyId}${assetNameHex}`,
            quantity: String(amount)
        }]

        const utxos = await blockchainProvider.fetchAddressUTxOs(HOT_WALLET_ADDRESS)

        await txBuilder
            .setNetwork(NETWORK)
            .txOut(userWalletAddress, assetsArr)
            .selectUtxosFrom(utxos)
            .changeAddress(HOT_WALLET_ADDRESS)
            .complete();

    } catch (err) {
        console.log(err);
        throw err;
    }

    /**
     * Sign the transaction and send to the blockchain
     */
    let txHash;

    try {

        const unsignedTx = txBuilder.txHex;
        const signedTx = await walletObj.signTx(unsignedTx, true);
        txHash = await walletObj.submitTx(signedTx);
        console.log(`2 - sent orderId: ${orderIdStr} txHash: ${txHash}`);

    } catch (err) {
        // console.log(err);
        throw err;
    }


    if (!txHash) {
        // await incrementRetries(orderIdObj);
        return
    }

    try {
        const sendStatus = await updateStatusToSent(orderIdObj, txHash);
        console.log(`2 - change status on orderId: ${orderIdStr} to sent`)

    } catch (err) {
        console.log(err);
        throw err;
    }
}



/**************************************
 3 - Check order delivery
 *************************************/

const checkForDeliveredOrders = async () => {

    let docs;

    try {
        docs = await findOrders('sent', 99999);
    } catch (err) {
        console.log(err);
        throw err;
    }

    if (!docs || !docs.length) {
        // console.log("delivery queue - empty")
        return
    }

    for (const doc of docs) {
        const orderIdObj = doc._id
        const orderIdStr = orderIdObj.toString();

        const txHash = doc?.orderSentTxHash;

        if (!txHash) {
            continue
        }

        let txOnChain = false;
        try {
            txOnChain = await checkTxHashOnBlockchain(txHash);
        } catch (err) {
            console.log(err);
            continue
        }


        if (!txOnChain) {

            console.log(`3 - not yet on chain orderId: ${orderIdStr} txHash: ${txHash} retries: ${doc.retries}`);

            await incrementRetries(orderIdObj);
            continue
        }


        try {
            const deliveryStatus = await updateStatusToCompleted(orderIdObj);
            console.log(`3 - changed the status on orderId: ${orderIdStr} to completed`);
            // console.log("--- sendStatus");
            // console.log(sendStatus);
        } catch (err) {
            console.log(err);
            continue
        }
    }

}

/**************************************
 4 - Check failed tickets
 *************************************/

const checkForFailedTickets = async () => {

    const query = {
        status: "initiated",
        createdDateTime : {"$lt" : new Date(Date.now() - MAX_LOOKBACK_MS) }
    }

    const options = {
        $set: {
            status: "failed",
            timestamp: new Date()
        }
    }

    try {
        const doc = await orders.updateMany(query, options)
        console.log(`4 - changed incomplete orders older than 24h to failed`);
        // console.log(doc)
        return doc
    } catch (err) {
        console.log(err)
        throw err
    }

}

// required to avoid overlapping loops
let finishedLastLoop = true;

setInterval(async() => {

    if (!finishedLastLoop) return
    finishedLastLoop = false

    try {
        await connectToDB();
        if (!walletObj) {
            await initHotWallet();
        }
        if (!evmProvider) {
            await initEvmProvider();
        }
    } catch (err) {
        console.log(err);
    }

    // console.log((new Date).toLocaleString('en-GB'))

    const start = Date.now();

    try {
        await checkForPaymentReceived()
        await sendOrder()
        await checkForDeliveredOrders()

    } catch (err) {
        if (err.response.status === 403) {
            console.log(`# - error submitting Tx, wallet still processing previous Tx, wait ...`)
        } else {
            console.log(err)
        }
    }

    finishedLastLoop = true;

    const end = Date.now();
    console.log(`Time: ${(new Date).toLocaleString('en-GB')} Execution time: ${end - start} ms`);

}, 5000)




setInterval(async() => {

    console.log("Checking for Failed trades")

    try {
        await checkForFailedTickets();

    } catch (err) {
        console.log(err)
    }

}, 3*60*60*1000)
