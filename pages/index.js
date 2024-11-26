import React from 'react';
import {observer} from "mobx-react";
import {State} from "@/components/State";
import '@blueprintjs/core/lib/css/blueprint.css'
import '@blueprintjs/icons/lib/css/blueprint-icons.css'
import { StarIcon } from '@heroicons/react/20/solid'
import classNames from "classnames";
import Image from "next/image";
import IndexHeader from "@/components/IndexHeader";
import Head from 'next/head';
import {FormGroup, InputGroup} from "@blueprintjs/core";
import {reaction} from "mobx";
import {isObjEmpty} from "@/components/utils";
import PayWithWert from "@/components/PayWithWert";
import axios from "axios";


export const getServerSideProps = async (ctx) => {

  const WERT_WEBHOOK_API = process.env.WERT_WEBHOOK_API;
  const ASSET_NAME = process.env.ASSET_NAME;
  const ASSET_IMG_SRC = process.env.ASSET_IMG_SRC;

  return {
    props: {
      WERT_WEBHOOK_API,
      ASSET_NAME,
      ASSET_IMG_SRC,
    }
  }
}


const reviews = { href: '#', average: 4, totalCount: 117 }

const Home = observer(class Home extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      changeAddress: "",
      wertPrvKey: "",
      wertPartnerId: "",
    }

    this.globalState = State;
    this.reactionDisposer = undefined;

  }


  handleWertInitiated = async () => {
    const paymentTxHash = undefined;
    let buyStatus = this.state.buyStatus;
    buyStatus.processing = true;
    buyStatus.initiated = true;
    buyStatus.paymentDelivered = false;
    buyStatus.ticketQueued = false;
    buyStatus.ticketSent = false;
    buyStatus.ticketDelivered = false;

    const buySentTxHash = undefined;

    this.setState({paymentTxHash, buyStatus, buySentTxHash});

    try {
      const buyId = await this.addTicketToQueue("wert");
      return buyId
    } catch (err) {
      throw err;
    }
  }


  addTicketToQueue = async () => {

    const payMethod = "fiat"

    let payload = {
      purpose: "newticket",
      ticketPolicyId: this.props.eventDict.ticketPolicyId,
      ticketAssetName: this.props.eventDict.ticketAssetName,
      ticketAmount: 1,
      collatAdaAmount: this.props.collatRequired || 0,
      paymentTxHash: this.state.paymentTxHash,
      userWalletAddress: this.props.walletAddress,
      payMethod: payMethod,
      status: "initiated"
    };
    const req = JSON.stringify(payload);

    // console.log(req)

    try {
      const URL = `${this.props.WERT_WEBHOOK_API}/tickets`
      const response = await axios.post(URL, req, {headers: {'Content-Type': 'application/json'}})

      if (response.status === 201) {

        // console.log(response.data)
        const ticketId = response.data?._id || undefined;
        this.setState({ticketId});
        return ticketId

      } else {
        // console.log(response)
        throw Error ("could not retrieve ticketId")
      }

    } catch (err) {
      throw err;
    }
  }


  updateTxHashInDB = async (ticketId, paymentTxHash) => {

    let payload = {
      purpose: "updatetxhash",
      ticketId,
      paymentTxHash
    }

    const req = JSON.stringify(payload);

    try {
      const URL = `${this.props.WERT_WEBHOOK_API}/tickets`
      const response = await axios.post(URL, req, {headers: {'Content-Type': 'application/json'}})

      if (response.status === 200) {

        const data = response.data;
        // console.log(data);
        return data

      } else {
        // console.log(response)
        throw Error("Error updating paymentTxHash")
      }

    } catch (err) {
      throw err;
    }

  }


  componentDidMount() {

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
                  <p className="text-3xl tracking-tight text-gray-900">$75</p>

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
                          ticketId={this.state.ticketId}
                          ticketAssetName={this.props.ASSET_NAME}
                          ticketImgSrc={this.props.ASSET_IMG_SRC || ""}
                          // eventId={this.props.eventId}
                          // walletAddress={this.props.walletAddress}
                          updateTxHashInDB={this.updateTxHashInDB}
                      />
                    }

                    <div id="wert_credentials" className="text-base font-strong text-gray-700">
                      <FormGroup
                          helperText={<div className="text-gray-700">Your Partner ID on the Wert.io platform</div>}
                          style={{fontSize: "12px"}}
                          label="Wert Partner Id"
                      >
                        <InputGroup
                            style={{fontSize: "12px"}}
                            disabled={false}
                            placeholder="should start with 0x..."
                            leftIcon="id-number"
                            onChange={(str) => {

                              this.setState({wertPartnerId: str.target.value})
                            }}
                            value={this.state.wertPartnerId}

                        />
                      </FormGroup>

                      <FormGroup
                          helperText={<div className="text-gray-700">The private key that you should have received when
                            signing up with Wert.io</div>}
                          style={{fontSize: "12px"}}
                          label="Wert Private Key"
                      >
                        <InputGroup
                            style={{fontSize: "12px"}}
                            disabled={false}
                            placeholder="should start with 0x..."
                            leftIcon="id-number"
                            onChange={(str) => {

                              this.setState({wertPrvKey: str.target.value})
                            }}
                            value={this.state.wertPrvKey}

                        />
                      </FormGroup>
                    </div>


                    <div className="mt-10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Status</h3>
                        <p className="text-sm font-medium text-gray-400">
                          ... purchase progress reported here
                        </p>
                      </div>


                    </div>


                  </div>
                </div>

                <div className="py-10 lg:col-span-2 lg:col-start-1 lg:border-r lg:border-gray-200 lg:pb-16 lg:pr-8 lg:pt-6">
                  {/* Description and details */}
                  <div className="">
                    <h3 className="sr-only">Description</h3>


                    <div className="space-y-6 pb-8">
                      <p className="text-base text-gray-900">
                        An exclusive NFT that captures the electrifying blend of sport and sci-fi. This one-of-a-kind artwork showcases a futuristic athlete carving through massive, glowing waves on a vibrant ocean. The windsurfer's gear features neon accents and advanced materials, while the high-tech sail glows with energy patterns. A mesmerizing sunset bathes the scene in vivid hues of orange, pink, and purple, complemented by the dramatic splash of holographic water.
                      </p>
                    </div>
                    <Image src="/images/nftxyz.png" alt="nft xyz" width="700" height="700"/>

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

export default Home;
