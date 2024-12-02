import { MeshWallet, KoiosProvider } from "@meshsdk/core";

/**
 * An API that generates new wallet and gives the private key
 * The private key is similar to a wallet mnemonic and is
 * used for signing transactions. This api is useful to
 * generate new wallet when testing the application
 */

const handle = async (req, res) => {

	const blockchainProvider = new KoiosProvider('preview');

	const privateKey = MeshWallet.brew(true);
	const walletObj = new MeshWallet({
		networkId: 0, // 0: testnet, 1: mainnet
		fetcher: blockchainProvider,
		submitter: blockchainProvider,
		key: {
			type: 'root',
			bech32: privateKey,
		},
	});

	const walletAddress = walletObj.getChangeAddress()

	const returnDict = {
		warning: "--- USE FOR TESTING ONLY! ---",
		walletAddress,
		privateKey
	}

	res.status(200).json(returnDict);

}

export default handle;
