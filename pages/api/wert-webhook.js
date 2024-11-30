import mongoose from "mongoose";
import OrderSchema from "./models/OrderSchema";

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DB = process.env.MONGODB_DB;

const DB_URL = `${MONGODB_URL}/${MONGODB_DB}`;


let connection;
try {
    connection = mongoose.createConnection(DB_URL,{maxPoolSize: 10, useNewUrlParser: true, useUnifiedTopology: true});
    console.log('new DB connection established')
} catch(err) {
    console.log(err)
}

const handle = async (req, res) => {


    if (req.method === "POST") {

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

        res.status(200).json({});


    }



};

export default handle;
