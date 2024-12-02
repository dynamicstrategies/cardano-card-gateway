/**
 * This Daemon is responsible for monitoring payments and sending assets
 * on the Cardano Network. It is organized in 5 steps:
 *
 * 1 - Initialize connections to the database, connect to a Cardano blockchain
 * indexed (e.g. Koios https://koios.rest/), and set-up a wallet from where to
 * send transactions. And a connection to the EVM blockchain to monitor that payment
 * iss delivered into the smart contract
 *
 * 2 - Check that payment has been received for the assets. This is done by
 * periodically checking (e.g. every 5 seconds) the status of all orders
 * that have been registered in the database. And then for the orders
 * where the payment processor has confirmed payment, further check by
 * querying the EVM transaction that it was done with the right smart contract
 * and for the right amount
 *
 * 3 - Once the payment has been confirmed by the payment processor
 * and independently checked on the EVM blockchain by the daemon, the next step
 * is to build the transaction and send it to the user's Cardano wallet
 *
 * 4 - Continuously check for order delivery to the user by checking
 * the state of the transaction on the Cardano blockchain. Once the
 * transaction has been confirmed, update the DB. This will then
 * be picked up by the frontend and shown to the user that the transaction
 * has been delivered to their wallet
 *
 * 5 - Check for transactions that have been pending for a long time and
 * mark those for which payment has not been received in 24 hours as failed
 * After this point the daemon will stop continuously checking for their
 * status
 *
 * memo: the order status has 5 stages:
 * - initiated - when the user has requested to Pay with Card for an order
 * - transfer_started - when payment processor received the order
 * - paid - when user paid for the order and payment processor has paid you
 * - sent - when the ticket has been sent to the user into their Cardano wallet
 * - delivered - when the order has been delivered to the user's Cardano wallet
 *
 * The script monitors for each of the above stages
 * It sends the ticket only when payment has been received
 */
require('dotenv').config()
const { MongoClient } = require('mongodb');
const {KoiosProvider, MeshWallet, MeshTxBuilder} = require("@meshsdk/core");
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

let db;
let orders;
let blockchainProvider;
let walletObj;
let evmProvider;


/**
 * 1.1 - Initialize the connection to the DB that stores the status of all orders
 * this DB is used extensively in the rest of the code
 */
const uri = MONGODB_URL || 'mongodb://localhost:27048';
const dbName = MONGODB_DB || 'cgateway';
const client = new MongoClient(uri);

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


/**
 * 1.2 - Initialized an instance of the Cardano Hot wallet
 * that holds the digital assets being sold on the frontend
 * The MeshJS library is used to create the wallet and send
 * transactions.
 *
 * The Koios Cardano blockchain indexer is used to send and
 * query the status of transactions on the Cardano blockchain.
 * The indexer is initialized here also using the MeshJS library
 */
initHotWallet = async () => {

    blockchainProvider = new KoiosProvider(NETWORK);
    const networkId = NETWORK === "preview" ? "0" : NETWORK === "preprod" ? "0" : "1"

    try {
        walletObj = new MeshWallet({
            networkId,
            fetcher: blockchainProvider,
            submitter: blockchainProvider,
            key: {
                type: 'root',
                bech32: HOT_WALLET_PRVKEY,
            },
        });
    } catch (err) {
        console.log("Could not Initialize the Hot Wallet with MeshJS. Check the Private Key environment variable")
        console.error(err)
    }


}

initHotWallet();


/**
 * 1.3 - Initialize the connection to an EVM blockchain indexer
 * It connects to the Polygon network and is used to check
 * that payments have been recived in the EVM smart contract.
 * Uses the Ethers library
 *
 */
initEvmProvider = async () => {
    evmProvider = new ethers.JsonRpcProvider(EVM_RPC);
}

initEvmProvider();



/**
 * Helper functions that interact with the DB
 *
 * - findOrders - finds orders in the DB with specific status and age
 *
 * - updateStatusToPaymentConfirmed - updates the order field "paymentConfirmed" to true
 * this is done after checking that the smart contract has received the correct amount
 * from the payment processor Wert.io
 *
 * - updateStatusToSent - update the status of and order to "sent". In this sate the
 * asset should be registered on the Cardano blockchain and en-route to the user's wallet
 *
 * - updateStatusToCompleted - updates the status of an order to "completed" which means
 * the asset has been sent to the user's wallet and has been delivered, by
 * checking that the transaction was included in a block.
 *
 * - checkTxHashOnBlockchain - queries the Cardano blockchain if the transaction has been
 * included in a block
 *
 *  - checkEVMPaymentCompletion - Check that the payment was made to the correct EVM contract
 * and that the pay amount was of at least the price that was expected
 *
 * - incrementRetries - increments the field "retries" by 1 in the DB. This is to keep track how
 * many times the daemon has gone through the order in its current status. Useful for
 * debugging if an order has been stuck in a state for a long time
 */
const findOrders = async (withStatus, limit) => {

    const query = {
        status: withStatus,
        createdDateTime : {"$gt" : new Date(Date.now() - MAX_LOOKBACK_MS) }
    }

    try {
        const docs = await orders.find(query).limit(limit).sort({timestamp: 1})
        const docsArr = docs.toArray();
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
            console.log(`3 - Tx ${txHash} included in the slot ${slotN}`);
            return true
        } else {
            // console.log(`Tx ${txHash} not yet on the blockchain`)
            return false
        }

    } catch (err) {
        if (err = "[]") {
            // console.log(`Tx ${txHash} not yet on the blockchain`)
            return false
        } else {
           throw err
        }
    }
}


const checkEVMPaymentCompletion = async (evmTxHash, evmContractAddress, priceInPol) => {

    try {
        const evmTx = await evmProvider.getTransaction(evmTxHash);

        /**
         * Check that the payment was made to the correct EVM contract
         * and that the pay amount was of at least the price that
         * was expected
         */
        if (
            evmTx.value >= priceInPol * 1e18 &&
            evmTx.to &&
            evmContractAddress.toLowerCase() === evmTx.to.toLowerCase()
        ) {
            return true
        } else {
            return false
        }

    } catch (err) {
        console.error(err)
        return false
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
 2 - Check that payment has been received
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


        let isPaymentSuccess = false;
        const payMethod = doc.payMethod;


        if (payMethod === "wert") {

            isPaymentSuccess = await checkEVMPaymentCompletion(txHash, doc?.evmContractAddress, doc?.priceInPol)

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
 3 - Send the ticket to user
 *************************************/
const sendOrder = async () => {

    /**
     * Find an order in the queue where the payment processor updated
     * status to paid
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

    /**
     * Find a doc that has had its payment confirmed on the
     * EVM blockchain
     */
    let doc;
    for (const x of docs) {
        if (x?.paymentConfirmed) {
            doc = x;
            break
        }
    }

    const orderIdObj = doc._id
    const orderIdStr = orderIdObj.toString();

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
 4 - Check order delivery
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
 5 - Check failed tickets
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
