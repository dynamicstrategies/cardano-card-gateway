import React from 'react';
import {observer} from "mobx-react";
import { withRouter } from 'next/router';
import {State} from "@/components/State";
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import { StarIcon } from '@heroicons/react/20/solid'
import classNames from "classnames";
import Image from "next/image";
import IndexHeader from "@/components/IndexHeader";
import Head from 'next/head';
import {FormGroup, Icon, InputGroup, Intent, Spinner, SpinnerSize} from "@blueprintjs/core";
import {reaction} from "mobx";
import {isObjEmpty, truncate} from "@/components/utils";
import PayWithWert from "@/components/PayWithWert";
import axios from "axios";

/**
 * NextJS allows you to read the variables from an .env file and pass them as props
 * to the component. The .env variables can then be defined in the docker-compose file
 * in production
 */
export const getServerSideProps = async (ctx) => {

  const wertPrvKey = ctx.query?.wertPrvKey || null;
  const wertPartnerId = ctx.query?.wertPartnerId || null;

  const WERT_WEBHOOK_API = process.env.WERT_WEBHOOK_API;
  const ASSET_POLICY_ID = process.env.ASSET_POLICY_ID
  const ASSET_NAME = process.env.ASSET_NAME;
  const ASSET_IMG_SRC = process.env.ASSET_IMG_SRC;
  const EVM_SC_ADDRESS = process.env.EVM_SC_ADDRESS;

  return {
    props: {
      WERT_WEBHOOK_API,
      ASSET_POLICY_ID,
      ASSET_NAME,
      ASSET_IMG_SRC,
      EVM_SC_ADDRESS,
      wertPrvKey,
      wertPartnerId,
    }
  }
}


const reviews = { href: '#', average: 4, totalCount: 117 }


/**
 * This is a Class component with the content of the main page.
 * Class components allow for better state management and that is
 * why we chose them over Functional components for this project
 */
const Front = observer(class Front extends React.Component {

  constructor(props) {
    super(props);


    // Local State
    this.state = {
      changeAddress: "",
      wertPrvKey: this.props.wertPrvKey,
      wertPartnerId: this.props.wertPartnerId,

      orderId: undefined,

      orderStatus: {
        processing: false,
        initiated: false,
        paymentDelivered: false,
        orderQueued: false,
        orderSent: false,
        orderDelivered: false,
      },

      orderSentTxHash: undefined,


    }

    // Global state managed by mobX
    this.globalState = State;

    // non-state, global variabales
    this.reactionDisposer = undefined;

  }


  handleWertInitiated = async () => {
    const paymentTxHash = undefined;
    let orderStatus = this.state.orderStatus;
    orderStatus.processing = true;
    orderStatus.initiated = true;
    orderStatus.paymentDelivered = false;
    orderStatus.orderQueued = false;
    orderStatus.orderSent = false;
    orderStatus.orderDelivered = false;

    const orderSentTxHash = undefined;

    this.setState({paymentTxHash, orderStatus, orderSentTxHash});

    try {
      const orderId = await this.addTicketToQueue();
      return orderId
    } catch (err) {
      throw err;
    }
  }


  addTicketToQueue = async () => {

    const payMethod = "wert"

    let payload = {
      purpose: "neworder",
      policyId: this.props.ASSET_POLICY_ID,
      assetName: this.props.ASSET_NAME,
      amount: 1,
      paymentTxHash: this.state.paymentTxHash,
      userWalletAddress: this.state.changeAddress,
      payMethod,
      status: "initiated",
    };
    const req = JSON.stringify(payload);

    // console.log(req)

    try {
      const URL = `${this.props.WERT_WEBHOOK_API}/orders`
      const response = await axios.post(URL, req, {headers: {'Content-Type': 'application/json'}})

      if (response.status === 201) {

        // console.log(response.data)
        const orderId = response.data?._id || undefined;
        this.setState({orderId});
        return orderId

      } else {
        // console.log(response)
        throw Error ("could not retrieve orderId")
      }

    } catch (err) {
      throw err;
    }
  }


  // updateTxHashInDB = async (orderId, paymentTxHash) => {
  //
  //   let payload = {
  //     purpose: "updatetxhash",
  //     orderId,
  //     paymentTxHash
  //   }
  //
  //   const req = JSON.stringify(payload);
  //
  //   try {
  //     const URL = `${this.props.WERT_WEBHOOK_API}/orders`
  //     const response = await axios.post(URL, req, {headers: {'Content-Type': 'application/json'}})
  //
  //     if (response.status === 200) {
  //
  //       const data = response.data;
  //       // console.log(data);
  //       return data
  //
  //     } else {
  //       // console.log(response)
  //       throw Error("Error updating paymentTxHash")
  //     }
  //
  //   } catch (err) {
  //     throw err;
  //   }
  //
  // }




  getTicketStatusById = async (orderId) => {


    const payload = {
      purpose: "get_status",
      orderId: orderId,
    }

    const req = JSON.stringify(payload)
    // console.log(req)

    try {

      const URL = `${this.props.WERT_WEBHOOK_API}/orders`
      const response = await axios.post(URL, req, {headers: {'Content-Type': 'application/json'}})

      // const response = await axios({
      //   method: 'get',
      //   url: '/orders',
      //   baseURL: this.props.WERT_WEBHOOK_API,
      //   params: req,
      //   headers: {'Content-Type': 'application/json'},
      // })

      if (response.status === 200) {

        const orderStatus = response.data?.status;
        // console.log("--- orderStatus")
        // console.log(orderStatus)

        return orderStatus;

      } else {
        console.error(response)
      }

    } catch(err) {
      console.log(err)
    }

    return undefined;

  }



  /**
   * Monitor ticket status in the DB and updates
   * in the front end
   */
  setTicketIdState = async () => {

    if (this.state.orderId) {

      let status;
      try {
        status = await this.getTicketStatusById(this.state.orderId);
      } catch (err) {
        console.log(err);
      }

      let orderStatus = this.state.orderStatus;

      /**
       * Set the order status according to its state
       * in the DB
       */
      if (status === "initiated") {
        orderStatus.initiated = true;
      } else if (status === "paid") {
        orderStatus.processing = true;
        orderStatus.initiated = true;
        orderStatus.paymentDelivered = true;
        orderStatus.orderQueued = true;
      } else if (status === "sent") {
        orderStatus.processing = true;
        orderStatus.initiated = true;
        orderStatus.paymentDelivered = true;
        orderStatus.orderQueued = true;
        orderStatus.orderSent = true;
      } else if (status === "completed") {
        orderStatus.processing = true;
        orderStatus.initiated = true;
        orderStatus.paymentDelivered = true;
        orderStatus.orderQueued = true;
        orderStatus.orderSent = true;
        orderStatus.orderDelivered = true;
      }

      this.setState({orderStatus});

      /*
	  Get Transaction Hash of the tokens sent to wallet
	   */
      if (!this.state.orderSentTxHash && (status !== "completed" || status !== "sent")) {
        try {
          const orderSentTxHash = await this.getTicketSentTxHashById(this.state.orderId);
          this.setState({orderSentTxHash});
        } catch (err) {
          console.log(err);
        }
      }
    }
  }


  getTicketSentTxHashById = async (orderId) => {

    const payload = {
      purpose: "get_senttxhash",
      orderId: orderId,
    }

    const req = JSON.stringify(payload)

    try {

      const URL = `${this.props.WERT_WEBHOOK_API}/orders`
      const response = await axios.post(URL, req, {headers: {'Content-Type': 'application/json'}})

      // const response = await axios({
      //   method: 'GET',
      //   url: '/orders',
      //   baseURL: this.props.WERT_WEBHOOK_API,
      //   params: req,
      //   headers: {'Content-Type': 'application/json'},
      // })

      if (response.status === 200) {

        const orderSentTxHash = response.data?.orderSentTxHash;
        // console.log("--- orderSentTxHash")
        // console.log(orderSentTxHash)

        return orderSentTxHash;

      } else {
        console.error(response)
      }

    } catch(err) {
      console.log(err)
    }

    return undefined;

  }



  componentDidMount() {


    /**
     * Sets up a loop to run every 5 seconds (5000 milliseconds) and check for
     * status update on the ticket payment in the DB. Once
     * the status is updated in the DB it is then reflected
     * in the UI. The 5 seconds gap can be reduced to increase UX
     * or increased if server performance is lacking
     * @type {number}
     */
    this.runInterval  = setInterval(() => {
      this.setTicketIdState().then(() => {});
      // this.setTimeDiff();
    }, 5000);


    /**
     * The reaction disposer is linked to the global state mobX
     * It monitors for updates to global state and as soon as
     * the global changes it updates the local state
     * @type {IReactionDisposer}
     */
    this.reactionDisposer = reaction(() => {
      const changeAddress = this.globalState.CardanoWallet.changeAddress;
      return changeAddress
    }, (changeAddress) => {
      if (changeAddress !== "") {
        this.setState({changeAddress})
      }
    })
  }

  componentWillUnmount() {

    /**
     * the reaction disposes from mobX that monitors for global
     * state updates needs to be disposed of once the app terminates
     * or refresh, to avoid consuming resources and so it
     * starts fresh the next time the app is launched
     */
    this.reactionDisposer();
  }

  render() {
    return (

        <div>

          <Head>
            <title>Cardano NFT Shop</title>
            <meta name="description"
                  content="NFTs"/>
            <meta name="keywords"
                  content="Cardano, Web3, BLockchain, NFT"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
          </Head>

          <div className="bg-white h-screen">

            <IndexHeader/>

            <div className="pt-8 relative isolate">
              <nav aria-label="Breadcrumb">
                <ol role="list" className="mx-auto flex max-w-2xl items-center space-x-2 px-4 sm:px-6 lg:max-w-7xl lg:px-8">

                  <li key="bchome">
                    <div className="flex items-center">
                      <a href="#" className="mr-2 text-sm font-medium text-gray-900">
                        Home
                      </a>
                      <svg
                          fill="currentColor"
                          width={16}
                          height={20}
                          viewBox="0 0 16 20"
                          aria-hidden="true"
                          className="h-5 w-4 text-gray-300"
                      >
                        <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                      </svg>
                    </div>
                  </li>

                  <li key="bccollections">
                    <div className="flex items-center">
                      <a href="#" className="mr-2 text-sm font-medium text-gray-900">
                        Collections
                      </a>
                      <svg
                          fill="currentColor"
                          width={16}
                          height={20}
                          viewBox="0 0 16 20"
                          aria-hidden="true"
                          className="h-5 w-4 text-gray-300"
                      >
                        <path d="M5.697 4.34L8.98 16.532h1.327L7.025 4.341H5.697z" />
                      </svg>
                    </div>
                  </li>

                  <li className="text-sm">
                    <a href="#" aria-current="page" className="font-medium text-gray-500 hover:text-gray-600">
                      Cardano NFT XYZ
                    </a>
                  </li>
                </ol>
              </nav>

              {/* Product info */}
              <div className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-3 lg:grid-rows-[auto,auto,1fr] lg:gap-x-8 lg:px-8 lg:pb-24 lg:pt-8">
                <div className="lg:col-span-2 lg:border-r lg:border-gray-200 lg:pr-8">
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Neon Windsurfer</h1>
                </div>

                {/* Options */}
                <div className="mt-4 lg:row-span-3 lg:mt-0">
                  <h2 className="sr-only">Product information</h2>
                  <p className="text-3xl tracking-tight text-gray-900">$1.5</p>

                  {/* Reviews */}
                  <div className="mt-6">
                    <h3 className="sr-only">Reviews</h3>
                    <div className="flex items-center">
                      <div className="flex items-center">
                        {[0, 1, 2, 3, 4].map((rating) => (
                            <StarIcon
                                key={rating}
                                aria-hidden="true"
                                className={classNames(
                                    reviews.average > rating ? 'text-gray-900' : 'text-gray-200',
                                    'size-5 shrink-0',
                                )}
                            />
                        ))}
                      </div>
                      <p className="sr-only">{reviews.average} out of 5 stars</p>
                      <a href={reviews.href} className="ml-3 text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        {reviews.totalCount} reviews
                      </a>
                    </div>
                  </div>

                  <div className="mt-10">
                    {/* Colors */}
                    <div>
                      <h3 className="text-sm pb-4 font-medium text-gray-900">Wallet Address</h3>

                      <div id="ticket_processing_status" className="text-base font-strong text-gray-700">
                        <FormGroup
                            helperText={<div className="text-gray-700">Address that will receive the purchased NFT, starts with
                              addr...</div>}
                            // label="Wallet Address"
                        >
                          <InputGroup
                              style={
                                this.state.changeAddress
                                    ? {fontSize: "12px"}
                                    : {fontSize: "12px", backgroundColor: "rgb(245,160,64)", textAlign: "center", color: "#131B4D"}
                              }
                              disabled={false}
                              placeholder="should start with addr..."
                              leftIcon="id-number"
                              onChange={(str) => {

                                this.setState({changeAddress: str.target.value})
                              }}
                              value={this.state.changeAddress}
                              // rightElement={
                              //     <div className={"ud-p-1"}>
                              //
                              //     </div>
                              // }

                          />
                        </FormGroup>

                      </div>

                    </div>



                    {/*<button*/}
                    {/*    type="submit"*/}
                    {/*    className="mt-10 flex w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"*/}
                    {/*>*/}
                    {/*  Pay with Card*/}
                    {/*</button>*/}

                    {this.state.wertPartnerId &&
                      <PayWithWert
                          adaAmount={75}
                          WERT_WEBHOOK_API={this.props.WERT_WEBHOOK_API}
                          handleWertInitiated={this.handleWertInitiated}
                          WERT_PARTNER_ID={this.state.wertPartnerId}
                          WERT_SECRET_KEY={this.state.wertPrvKey}
                          orderId={this.state.orderId}
                          ticketAssetName={this.props.ASSET_NAME}
                          ticketImgSrc={this.props.ASSET_IMG_SRC || ""}
                          // eventId={this.props.eventId}
                          // walletAddress={this.props.walletAddress}
                          // updateTxHashInDB={this.updateTxHashInDB}
                      />
                    }

                    {/*<div id="wert_credentials" className="text-base font-strong text-gray-700">*/}
                    {/*  <FormGroup*/}
                    {/*      helperText={<div className="text-gray-700">Your Partner ID on the Wert.io platform</div>}*/}
                    {/*      style={{fontSize: "12px"}}*/}
                    {/*      label="Wert Partner Id"*/}
                    {/*  >*/}
                    {/*    <InputGroup*/}
                    {/*        style={{fontSize: "12px"}}*/}
                    {/*        disabled={false}*/}
                    {/*        placeholder="should start with 0x..."*/}
                    {/*        leftIcon="id-number"*/}
                    {/*        onChange={(str) => {*/}

                    {/*          this.setState({wertPartnerId: str.target.value})*/}
                    {/*        }}*/}
                    {/*        value={this.state.wertPartnerId}*/}

                    {/*    />*/}
                    {/*  </FormGroup>*/}

                    {/*  <FormGroup*/}
                    {/*      helperText={<div className="text-gray-700">The private key that you should have received when*/}
                    {/*        signing up with Wert.io</div>}*/}
                    {/*      style={{fontSize: "12px"}}*/}
                    {/*      label="Wert Private Key"*/}
                    {/*  >*/}
                    {/*    <InputGroup*/}
                    {/*        style={{fontSize: "12px"}}*/}
                    {/*        disabled={false}*/}
                    {/*        placeholder="should start with 0x..."*/}
                    {/*        leftIcon="id-number"*/}
                    {/*        onChange={(str) => {*/}

                    {/*          this.setState({wertPrvKey: str.target.value})*/}
                    {/*        }}*/}
                    {/*        value={this.state.wertPrvKey}*/}

                    {/*    />*/}
                    {/*  </FormGroup>*/}
                    {/*</div>*/}


                    <div className="mt-10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Status</h3>
                        <p className="text-sm font-medium text-gray-400">
                          ... purchase progress reported here
                        </p>
                      </div>

                      {(this.state.orderStatus.processing || this.state.orderId) &&
                          <div className="bg-gray-100 px-4 py-4 mt-8 mb-4 relative max-w-lg rounded-md">
                            <div className="flex mb-4 text-sm">
                              {
                                this.state.orderStatus.initiated
                                    ? <Icon
                                        className="text-green-500 hover:text-green-600"
                                        key="initiated_tick"
                                        icon="tick"
                                        size={16}
                                    />
                                    : <Spinner intent={Intent.NONE} size={SpinnerSize.SMALL} />
                              }
                              <div className="ml-2">Initiated</div>
                            </div>
                            <div className="flex mb-4 text-sm">
                              {
                                this.state.orderStatus.paymentDelivered
                                    ? <Icon
                                        className="text-green-500 hover:text-green-600"
                                        key="paymentDelivered_tick"
                                        icon="tick"
                                        size={16}
                                    />
                                    : <Spinner intent={Intent.NONE} size={SpinnerSize.SMALL} />
                              }
                              <div className="ml-2">Payment Delivered</div>
                            </div>
                            <div className="flex mb-4 text-sm">
                              {
                                this.state.orderStatus.orderQueued
                                    ? <Icon
                                        className="text-green-500 hover:text-green-600"
                                        key="orderQueued_tick"
                                        icon="tick"
                                        size={16}
                                    />
                                    : <Spinner intent={Intent.NONE} size={SpinnerSize.SMALL} />
                              }
                              <div className="ml-2">Order Queued</div>
                            </div>
                            <div className="flex mb-4 text-sm">
                              {
                                this.state.orderStatus.orderSent
                                    ? <Icon
                                        className="text-green-500 hover:text-green-600"
                                        key="orderSent_tick"
                                        icon="tick"
                                        size={16}
                                    />
                                    : <Spinner intent={Intent.NONE} size={SpinnerSize.SMALL} />
                              }
                              <div className="ml-2">Ticket Sent</div>
                            </div>
                            <div className="flex text-sm">
                              {
                                this.state.orderStatus.orderDelivered
                                    ? <Icon
                                        className="text-green-500 hover:text-green-600"
                                        key="orderDelivered_tick"
                                        icon="tick"
                                        size={16}
                                    />
                                    : <Spinner intent={Intent.NONE} size={SpinnerSize.SMALL} />
                              }
                              <div className="ml-2">Order Delivered</div>
                            </div>


                            {this.state.orderSentTxHash
                                ?
                                <div className="flex items-center mt-4">
                                  <span className="bg-gray-50 text-sm mr-2">{`TxHash: ${truncate(String(this.state.orderSentTxHash) || '',30,'...')}` + " "}</span>
                                  <Icon
                                      className="text-gray-500 hover:text-gray-700"
                                      key="submittedTxHash_copy"
                                      icon="duplicate"
                                      size={14}
                                      onClick={() => navigator.clipboard.writeText(String(this.state.orderSentTxHash))}
                                  />
                                </div>
                                :
                                null
                            }


                          </div>
                      }


                    </div>


                  </div>
                </div>

                <div className="py-10 lg:col-span-2 lg:col-start-1 lg:border-r lg:border-gray-200 lg:pb-16 lg:pr-8 lg:pt-6">
                  {/* Description and details */}
                  <div className="">
                    <h3 className="sr-only">Description</h3>


                    <div className="space-y-6 pb-8">
                      <p className="text-base text-gray-900">
                        An exclusive NFT that captures the electrifying blend of sport and sci-fi.
                        This one-of-a-kind artwork showcases a futuristic athlete carving through
                        massive, glowing waves on a vibrant ocean. The windsurfer&apos;s gear features
                        neon accents and advanced materials, while the high-tech sail glows
                        with energy patterns. A mesmerizing sunset bathes the scene in vivid hues
                        of orange, pink, and purple, complemented by the dramatic splash of
                        holographic water.
                      </p>
                    </div>
                    <Image src="/images/nftxyz_500px.png" alt="nft xyz" width="700" height="700"/>

                  </div>

                  <div className="mt-10">
                    <h3 className="text-sm font-bold text-gray-900">Highlights</h3>

                    <div className="mt-4">
                      <ul role="list" className="list-disc space-y-2 pl-4 text-sm">

                        <li key="hl-1" className="text-gray-700">
                          Unique Collectible - Designed to stand out in any NFT collection,
                            this artwork represents a futuristic take on adventure and innovation, making it a
                            perfect piece for enthusiasts of sport, sci-fi, and digital art.
                        </li>
                        <li key="hl-2" className="text-gray-700">
                          Futuristic Aesthetics - Experience a blend of advanced
                            technology and athleticism, with glowing neon gear, a sleek windsurfing sail, and
                            holographic water effects that radiate energy.
                        </li>
                        <li key="hl-3" className="text-gray-700">
                          Dynamic Action - Captures the intensity of carving through massive, glowing waves,
                          with intricate details like splashing water and wind-driven motion that
                          immerse the viewer in the thrill of the moment.
                        </li>
                        <li key="hl-4" className="text-gray-700">
                          Vivid Sci-Fi Environment - A surreal sunset backdrop with radiant hues of orange,
                          pink, and purple reflects off the waves, creating a visually stunning atmosphere
                          that blends nature and technology.
                        </li>

                      </ul>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>


        </div>

    )
  }

})

export default withRouter(Front);
