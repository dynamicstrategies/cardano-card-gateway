import { observable, configure, action } from "mobx";
configure({enforceActions: "observed"});

export let State = observable({


    CardanoWallet :{
        whichWalletSelected: "eternl",
        get get_whichWalletSelected(){return(this.whichWalletSelected)},
        set_whichWalletSelected: action(function _(str){this.whichWalletSelected = str}),

        walletFound: false,

        walletIsEnabled: false,
        get get_walletIsEnabled(){return(this.walletIsEnabled)},
        set_walletIsEnabled: action(function _(bool){this.walletIsEnabled = bool}),

        networkId: undefined,
        get get_networkId(){return(this.networkId)},
        set_networkId: action(function _(str){this.networkId = str}),

        /*
        Token Map is a new Map() object where:
        - keys are policyid.tokenname
        - values is an object {policyIdHex, assetNameHex, assetNameString, assetAmount}
         */
        tokenMap: new Map(),
        get get_tokenMap(){return(this.tokenMap)},
        set_tokenMap: action(function _(map){this.tokenMap = map}),


        CollatUtxos: [],
        get get_CollatUtxos(){return(this.CollatUtxos)},
        set_CollatUtxos: action(function _(arr){this.CollatUtxos = arr}),

        changeAddress: undefined,
        get get_changeAddress(){return(this.changeAddress)},
        set_changeAddress: action(function _(str){this.changeAddress = str}),

        walletObj: undefined,
        get get_walletObj(){return(this.walletObj)},
        set_walletObj: action(function _(obj){this.walletObj = obj}),


    },

    CardanoProtocolParams: {

        linearFee: {
            minFeeA: "44",
            minFeeB: "155381",
        },
        minUtxo: "34482",
        poolDeposit: "500000000",
        keyDeposit: "2000000",
        maxValSize: 5000,
        maxTxSize: 16384,
        priceMem: 0.0577,
        priceStep: 0.0000721,
        coinsPerUtxoWord: "34482",

    }

})
