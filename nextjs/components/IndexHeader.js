import Image from 'next/image'
import React from 'react'
import Link from "next/link";
import {XMarkIcon} from "@heroicons/react/24/outline";
import {Dialog} from "@headlessui/react";
import WalletConnector from "@/components/WalletConnector";
import {observer} from "mobx-react";


const navigation = [
    // { name: 'Beta Version 0.32', href: '/' },
    // { name: 'Settings', href: '#' },
    // { name: 'Docs', href: '#' },
]

const IndexHeader = observer(class IndexHeader extends React.Component {

    constructor(props) {
        super(props);

        this.state = {
            isMobileMenuOpen: false,
        };
    }


    componentDidMount() {


    }

    componentWillUnmount() {

    }

    render() {
        return (

            <header className="bg-gray-50 border-b border-b-gray-200 inset-x-0 top-0 z-50">
                <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
                    <div className="flex lg:flex-1">
                        <Link href="#" className="-m-1.5 p-1.5">
                            <span className="sr-only">Logo</span>
                            <Image src="/images/author_logo.jpeg" alt="logo" width="70" height="70"/>
                        </Link>
                    </div>
                    <div className="flex">

                        <WalletConnector/>

                    </div>

                </nav>
                <Dialog as="div" className="lg:hidden" open={this.state.isMobileMenuOpen} onClose={() => this.setState({isMobileMenuOpen: false})}>
                    <div className="fixed inset-0 z-10" />
                    <Dialog.Panel className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
                        <div className="flex items-center justify-between">
                            <Link href="/" className="-m-1.5 p-1.5">
                                <span className="sr-only">Logo</span>

                                Logo
                            </Link>
                            <button
                                type="button"
                                className="-m-2.5 rounded-md p-2.5 text-gray-700"
                                onClick={() => this.setState({isMobileMenuOpen: false})}
                            >
                                <span className="sr-only">Close menu</span>
                                <XMarkIcon className="h-6 w-6 text-dark" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-12 flow-root">
                            <div className="-my-6 divide-y divide-gray-800">
                                <div className="space-y-2 py-6">
                                    {navigation.map((item) => (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className="-mx-3 block rounded-lg py-2 px-3 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-400"
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Dialog.Panel>
                </Dialog>
            </header>

        )
    }
})

export default IndexHeader;
