import React from "react";
import axios from "axios";
import WertWidget from '@wert-io/widget-initializer';
import { withRouter } from "next/router";

class PayWithWert extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isOpen: false,
            signedData: undefined,
            orderId: undefined,
            // priceUSD: undefined,

            wertOptions: {
                partner_id: this.props.WERT_PARTNER_ID,
                origin: 'https://sandbox.wert.io', // this option needed only in sandbox
                click_id: undefined,
                currency: "USD",
                width: 360,
                height: 700,
                listeners: {
                    // loaded: () => console.log('wert loaded'),
                    "payment-status": (e) => {console.log(e)}
                    // this.props.router.push(`/events?user=${this.props.walletAddress}&eventId=${this.props.eventId}&orderId=${this.state.orderId}`)
                },
                extra: {
                    item_info: {
                        author_image_url: "https://res.cloudinary.com/dgxb2zyjd/image/upload/v1732640572/businessman-character-avatar-isolated_24877-60111_qztsj0.avif",
                        author: "Author Name",
                        image_url: this.props.ticketImgSrc,
                        name: `${this.props.ticketAssetName}`,
                        seller: "NFT Company Name"
                    }
                }
            }

        }

        this.wertWidgetObj = undefined;


    }

    /*
    Gets the transaction Id and the clientSecret
    - clientSecret is used for Stripe to process payment
    - transactionId, is updated to the DB to track payment completion
     */
    getWertClientSecret = async (orderId) => {

        if (!orderId) return

        let payload = {
            orderId,
        };

        const req = JSON.stringify(payload);

        try {
            const URL = `${this.props.WERT_WEBHOOK_API}/wert-payment-intent`
            const response = await axios.post(URL, req, {headers: {'Content-Type': 'application/json'}})

            if (response.status === 200) {

                const data = response.data;
                const {signedData, _} = data
                // console.log("--- signedData")
                // console.log(signedData)
                this.setState({signedData});

                return signedData

            } else {
                console.log(response)
                throw Error("Error Submitting Transaction")
            }
        } catch (err) {
            throw err;
        }


    }

    handleClose = () => {
        this.setState({isOpen: false})
    }



    handleWindowResize = () => {
        const windowdWidth  = window.innerWidth;
        const windowdHeight = window.innerHeight;

        const wertOptions = this.state.wertOptions;

        if (windowdWidth >= 540) {
            const width = windowdWidth / 12 * 7;
            wertOptions.width = width;
            this.setState({wertOptions})

        }
    }


    /////////////////////////////////////////
    // executed when the component is loaded
    componentDidMount() {

        this.handleWindowResize();
        window.addEventListener('resize', this.handleWindowResize);

    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleWindowResize)
    }


    componentDidUpdate(prevProps) {
        if (prevProps.orderId !== this.props.orderId) {

            // console.log("new props passed")
            // const orderId = this.props.orderId
            // this.setState({adaAmount})
        }
    }


    render() {
        return (

            <div className="relative flex text-body-color-2 rounded-md dark:bg-transparent dark:text-body-color">
                <div className="py-2 px-4">

                    <div>
                        <button
                            className={"my-8 flex w-full items-center justify-center rounded-md border border-transparent bg-gray-600 px-8 py-3 text-base font-medium text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"}
                            onClick={ async () => {

                                this.setState({isOpen: !this.state.isOpen});

                                try {
                                    const orderId = await this.props.handleWertInitiated();
                                    console.log(`orderID: ${orderId}`)
                                    const signedData = await this.getWertClientSecret(orderId);
                                    const wertOptions = {...this.state.wertOptions, ...signedData};
                                    wertOptions.click_id = orderId;
                                    this.wertWidgetObj = new WertWidget({
                                        ...signedData,
                                        ...wertOptions,
                                    });

                                    console.log("Wert Options")
                                    console.log("-------------")
                                    console.log(wertOptions)
                                    this.setState({orderId, wertOptions});


                                    /**
                                     * Opens the Wert.io widget
                                     */
                                    this.wertWidgetObj.open();

                                } catch (err) {
                                    console.log(err);
                                }

                            }}
                            disabled={!this.props.adaAmount}
                            // disabled
                        >
                            Pay with Card
                        </button>
                    </div>

                </div>

            </div>

        )
    }
}


export default withRouter(PayWithWert);
