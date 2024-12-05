import React from 'react';
import {observer} from "mobx-react";
import { withRouter } from 'next/router';
import * as ed from '@noble/ed25519';


const ED25519 = observer(class ED25519 extends React.Component {

	constructor(props) {
		super(props);
		this.state = {
			privateKey: "",
			publicKey: ""
		}
	}


	generateKeys = async () => {
		const _privateKey = ed.utils.randomPrivateKey(); // 32-byte Uint8Array or string
		const _publicKey = await ed.getPublicKeyAsync(_privateKey);

		const publicKey = `0x${Buffer.from(_publicKey).toString('hex')}`
		const privateKey = `0x${Buffer.from(_privateKey).toString('hex')}`

		this.setState({publicKey, privateKey})

	}

	componentDidMount() {
		this.generateKeys().then(() => {})
	}
	componentWillUnmount() {}

	render() {
		return (
			<div className="m-8 font-mono">
				<p><span className="font-bold">Public key: </span>{this.state.publicKey}</p>
				<p><span className="font-bold">Private key: </span>{this.state.privateKey}</p>
			</div>
		)
	}
})

export default withRouter(ED25519);
