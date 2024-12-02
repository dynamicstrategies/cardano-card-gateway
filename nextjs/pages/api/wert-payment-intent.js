import { signSmartContractData } from '@wert-io/widget-sc-signer';

const WERT_COMMODITY = process.env.WERT_COMMODITY;
const WERT_NETWORK = process.env.WERT_NETWORK;
const WERT_PAYTO_WALLET = process.env.WERT_PAYTO_WALLET;
const EVM_SC_ADDRESS = process.env.EVM_SC_ADDRESS;
const ASSET_POL_PRICE = process.env.ASSET_POL_PRICE;

const handle = async (req, res) => {


    if (req.method === "POST") {

        let result;
        let statusCode;

        const {orderId, WERT_SECRET_KEY} = req.body;
        // console.log(orderId)

        const pricePOL = Number(ASSET_POL_PRICE);
        const evmSmartContractAddr = EVM_SC_ADDRESS;
        const evmSmartContractCallData = "0x6a62784200000000000000000000000080663d068d4d39173aa17bd16acf3d37555d6aab";

        /*
        Create the clientSecret that has
        the price parameters encoded for Wert
         */

        try {

            const signedData = signSmartContractData({
                address: WERT_PAYTO_WALLET, // user's address
                commodity: WERT_COMMODITY,
                commodity_amount: pricePOL, // the crypto amount that should be sent to the contract method
                network: WERT_NETWORK,
                sc_address: evmSmartContractAddr,
                sc_input_data: evmSmartContractCallData,
            }, WERT_SECRET_KEY);

            result = {signedData, pricePOL};
            statusCode = 200;

        } catch(err) {
            console.log(err)
            result = err;
            statusCode = 500;
        }


        res.status(statusCode).json(result);

        // res.status(500).json({});

    }

};

export default handle;
