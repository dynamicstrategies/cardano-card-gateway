import mongoose from "mongoose";
import FxrateSchema from "./models/FxrateSchema";

const MONGODB_URL = process.env.MONGODB_URL;
const MONGODB_DB = process.env.MONGODB_DB;
const DB_URL = `${MONGODB_URL}/${MONGODB_DB}`;

let connection;
try {
    connection = mongoose.createConnection(DB_URL,{maxPoolSize: 10});
    console.log('FX rates - new DB connection established')
} catch(err) {
    console.log(err)
}


/**
 * API handles getting FX rates from the DB and
 * updating FX rates in the DB
 *
 */
const handle = async (req, res) => {

    let result = "";
    let statusCode = 501;


    if (req.method === "POST") {

        const Fxrate = connection.model('Fxrate', FxrateSchema);

        if (req.body?.purpose === "get_fxrate") {

            const {
                baseCcy,
                counterCcy,
            } = req.body;

            try {
                result = await Fxrate.findOne({$and:[{baseCcy}, {counterCcy}]}).sort({timestamp: -1}).exec();
                // console.log(result)
                statusCode = 200;
            } catch (err) {
                result = err;
                statusCode = 500;
            }

        } else if (req.body?.purpose === "update_fxrate") {


            const timestamp = Date.now();
            let results = {};

            const Fxrate = connection.model('Fxrate', FxrateSchema);


            const fxrateDict = {
                baseCcy: "ETH",
                counterCcy: "USD",
                pair: "ETHUSD",
                rate: 3870,
                timestamp
            }


            try {

                // save the utxo to DB
                const doc = new Fxrate(fxrateDict);
                result = await doc.save();
                statusCode = 201;

            } catch (err) {
                console.error(err);
                statusCode = 400;
            }

        }

    }

    res.status(statusCode).json(result);

}

export default handle;
