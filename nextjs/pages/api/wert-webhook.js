/**
 * This API endpoint receives payment confirmations from the
 * payment processor (wert.io) and updates the order status in
 * the MongoDB database.
 *
 * When setting up the payment processor, the user should point to
 * this API endpoint in the processor's web interface to send order
 * status updates.
 *
 * The API endpoint accepts POST requests coming in and searches for
 * the field "type" to be equal to "order_complete" or "transfer_started".
 * The orderId is identified by the "click_id" from the payment processor
 * In each of these cases it will update the order status by updating the
 * status in the DB. Once the status is updated, it will then be seen by
 * the backend Daemon service to decide how to proceed with the order.
 */


import mongoose from "mongoose";
import OrderSchema from "./models/OrderSchema";

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DB = process.env.MONGODB_DB;
const DB_URL = `${MONGODB_URL}/${MONGODB_DB}`;

let connection;
try {
    connection = mongoose.createConnection(DB_URL,{maxPoolSize: 10});
    console.log('new DB connection established')
} catch(err) {
    console.log(err)
}

const handle = async (req, res) => {


    if (req.method === "POST") {


        /**
         * Check if the status update is of the "order_complete"
         * type and update accordingly in the DB
         */
        if (req.body?.type === "order_complete") {

            console.log(req.body)

            const orderId = req.body?.click_id;
            const paymentTxHash = req.body?.order.transaction_id;
            const retries = 0;
            const status = "paid";

            const Order = connection.model('Order', OrderSchema);

            const timestamp = Date.now();
            const update = {paymentTxHash, timestamp, retries, status}

            try {
                const doc = await Order.findByIdAndUpdate(orderId, update)
                console.log(`orderId: ${orderId} - paid`)
            } catch (err) {
                console.log(err)
            }

        /**
         * Check if the status update is of the "transfer_started"
         * type and update accordingly in the DB
         */
        } else if (req.body?.type === "transfer_started") {

            console.log(req.body)

            const orderId = req.body?.click_id;
            const paymentTxHash = req.body?.order.transaction_id;
            const status = "transfer_started";

            const Order = connection.model('Order', OrderSchema);

            const timestamp = Date.now();
            const update = {paymentTxHash, timestamp, status}

            try {
                const doc = await Order.findByIdAndUpdate(orderId, update)
                console.log(`orderId: ${orderId} - transfer started`)
            } catch (err) {
                console.log(err)
            }

        } else {

            console.log(req.body)

        }


        /**
         * Optional return back to the payment processor that the updates
         * was received successfully
          */
        res.status(200).json({});

    }
};

export default handle;
