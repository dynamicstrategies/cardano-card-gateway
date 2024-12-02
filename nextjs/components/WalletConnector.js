import React from "react";
import {
    Button,
    Overlay,
    Classes,
    H3,
    Intent
} from "@blueprintjs/core"
import classNames from "classnames";
import {observer} from "mobx-react";
import {State} from "./State";
import { BrowserWallet } from '@meshsdk/core';
import Image from "next/image";


const WalletConnector = observer(class WalletConnector extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isOpen: false,
            namiFound: false,
            eternlFound: false,
            tmpWalletSelected: "eternl",

        }
        this.globalState = State;

    }


    handleWalletSelect = async (walletName) => {
        try {
            this.setState({tmpWalletSelected: walletName})
        } catch (err) {
            console.error(err)
        }
    }


    /**
     * Checks if the wallet is running in the browser
     * Does this for Nami, eternl and Flint wallets
     * @returns {boolean}
     */

    checkWhichWalletsFound = async () => {

        const availableWallets = await BrowserWallet.getAvailableWallets()

        for (const wallet of availableWallets) {
            if (wallet.id === "eternl") {
                this.setState({eternlFound: true})
            } else if (wallet.id === "nami") {
                this.setState({namiFound: true})
            }
        }

    }

    getChangeAddress = async () => {

        const walletObj = this.globalState.CardanoWallet.get_walletObj

        try {
            const changeAddress = await walletObj.getChangeAddress();
            this.globalState.CardanoWallet.set_changeAddress(changeAddress)
            console.log(`changeAddress: ${changeAddress}`)
        } catch (err) {
            console.error(err)
        }
    }


    getCollateral = async () => {


        const walletObj = this.globalState.CardanoWallet.get_walletObj;

        try {

            const collateral = await walletObj.getCollateral();

            console.log("Collateral:")
            console.log(collateral)

            this.globalState.CardanoWallet.set_CollatUtxos(collateral);

        } catch (err) {
            console.error(err)
        }

    }


    /**
     * Enables the wallet that was chosen by the user
     * When this executes the user should get a window pop-up
     * from the wallet asking to approve the connection
     * of this app to the wallet
     * @returns {Promise<void>}
     */
    enableWallet = async (walletName) => {

        try {
            let walletObj = undefined;
            // const wallet = this.globalState.CardanoWallet.get_whichWalletSelected;
            if (walletName === "nami") {
                walletObj = await BrowserWallet.enable('nami');
            } else if (walletName === "eternl") {
                walletObj = await BrowserWallet.enable('eternl');
            }

            this.globalState.CardanoWallet.set_walletObj(walletObj);

            await this.checkIfWalletEnabled();
            await this.getNetworkId();
            await this.getChangeAddress();
            await this.getCollateral();

        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Checks if a connection has been established with
     * the wallet
     * @returns {Promise<boolean>}
     */
    checkIfWalletEnabled = async () => {

        let walletIsEnabled = false;

        try {
            const wallet = this.globalState.CardanoWallet.get_whichWalletSelected;
            if (wallet === "nami") {
                walletIsEnabled = await window.cardano.nami.isEnabled();
            } else if (wallet === "eternl") {
                walletIsEnabled = await window.cardano.eternl.isEnabled();
            }

            this.globalState.CardanoWallet.set_walletIsEnabled(walletIsEnabled)

        } catch (err) {
            console.log(err)
        }

        return walletIsEnabled
    }

    /**
     * Gets the Network ID to which the wallet is connected
     * 0 = testnet
     * 1 = mainnet
     * Then writes either 0 or 1 to state
     * @returns {Promise<void>}
     */
    getNetworkId = async () => {

        const walletObj = this.globalState.CardanoWallet.walletObj

        try {
            const networkId = await walletObj.getNetworkId();
            this.globalState.CardanoWallet.set_networkId(networkId)

        } catch (err) {
            console.log(err)
        }
    }

    printNetworkIdString = () => {
        const networkId = this.globalState.CardanoWallet.get_networkId;
        if (networkId === undefined) return "You are not Connected"
        if (networkId === 0) return "You are Connected to the TESTNET"
        if (networkId === 1) return "You are Connected to the MAINNET"
    }


    getWalletIconFromName = (walletName) => {
        if (walletName === "eternl") return <Image src="/images/eternl.svg" alt="eternl logo" layout="raw" height="25" width="25"/>
        if (walletName === "nami") return <Image src="/images/nami.svg" alt="nami logo" layout="raw" height="25" width="25"/>
    }



    /////////////////////////////////////////
    // executed when the component is loaded
    componentDidMount() {
        this.checkWhichWalletsFound().then(() => {});

    }

    componentWillUnmount() {

    }

    render() {
        return (


            <div className="relative">
                <div className="py-2 px-4">
                    <div>

                        <div className="flex place-content-end">
                            <a
                                className={`flex hover:no-underline whitespace-nowrap items-center justify-between rounded-md py-4 px-8 border border-gray-300 text-base font-semibold text-dark transition-all hover:border-mid-blue hover:bg-primary hover:text-mid-blue ${this.globalState.CardanoWallet.get_walletIsEnabled ? "" : ""}`}
                                onClick={() => {this.setState({isOpen: !this.state.isOpen});}}
                            >
                                {this.globalState.CardanoWallet.get_walletIsEnabled
                                    ? <div className="flex flex-nowrap items-center"><span className="mr-4">Connected to</span>{this.getWalletIconFromName(this.globalState.CardanoWallet.get_whichWalletSelected)}</div>
                                    : "Connect Wallet"}
                            </a>
                        </div>


                        <Overlay
                            className={classNames(Classes.OVERLAY_SCROLL_CONTAINER, "docs-overlay-example-transition", "mt-28 w-1/4 mx-auto")}
                            hasBackdrop={true}
                            isOpen={this.state.isOpen}
                            usePortal={true}
                            autoFocus={true}
                            useTallContent={false}
                            onClose={() => {this.setState({isOpen: !this.state.isOpen})}}
                        >
                                <div className={classNames(Classes.CARD, Classes.ELEVATION_4)}>
                                    <H3>Select Wallet to Connect</H3>
                                    <p>
                                        Choose which wallet you want to connect to. You will then be able to interact with DApp. If you don&apos;t have a wallet installed then you will need to install one of these - Nami, Eternl or Flint
                                    </p>
                                    <div style={{marginTop: "20px"}}>

                                        <div
                                            className={
                                                this.state.namiFound
                                                    ? this.state.tmpWalletSelected === "nami"
                                                        ? "flex flex-row justify-between items-center gap-x-2 p-4 border-t border-x border-gray-300 bg-blue-50"
                                                        : "flex flex-row justify-between items-center gap-x-2 p-4 border-t border-x border-gray-300 hover:bg-blue-50"
                                                    : "flex flex-row justify-between items-center gap-x-2 p-4 border-t border-x border-gray-300 bg-gray-100 text-gray-500"
                                            }
                                            onClick={() => {
                                                this.state.namiFound ? this.handleWalletSelect("nami") : null}}
                                        >
                                            <div className="flex-grow">Nami</div>
                                            {!this.state.namiFound && <div className="flex-shrink"><span className="py-1 px-2 bg-primary text-dark rounded-md text-xs">not found</span></div>}
                                            <Image src="/images/nami.svg" alt="nami logo" layout="raw" height="30" width="30"/>
                                        </div>

                                        <div
                                            className={
                                                this.state.eternlFound
                                                    ? this.state.tmpWalletSelected === "eternl"
                                                        ? "flex flex-row justify-between items-center gap-x-2 p-4 border border-gray-300 bg-blue-50"
                                                        : "flex flex-row justify-between items-center gap-x-2 p-4 border border-gray-300 hover:bg-blue-50"
                                                    : "flex flex-row justify-between items-center gap-x-2 p-4 border border-gray-300 bg-gray-100 text-gray-500"
                                            }
                                            onClick={() => {this.state.eternlFound ? this.handleWalletSelect("eternl") : null}}
                                        >
                                            <div className="flex-grow">Eternl</div>
                                            {!this.state.eternlFound && <div className="flex-shrink"><span className="py-1 px-2 bg-primary text-dark rounded-md text-xs">not found</span></div>}
                                            <Image src="/images/eternl.svg" alt="nami logo" layout="raw" height="30" width="30"/>
                                        </div>



                                    </div>
                                    <p className={"my-8"}>{`${this.printNetworkIdString()}`}</p>
                                    <Button intent={Intent.PRIMARY}
                                            onClick={() => {
                                                this.globalState.CardanoWallet.set_whichWalletSelected(this.state.tmpWalletSelected)
                                                this.enableWallet(this.state.tmpWalletSelected);
                                                this.setState({isOpen: !this.state.isOpen});
                                            }}
                                            style={{ marginTop: "4px" }}>
                                        Select
                                    </Button>
                                </div>
                        </Overlay>
                    </div>
                </div>

            </div>

        )
    }
})


export default WalletConnector;
