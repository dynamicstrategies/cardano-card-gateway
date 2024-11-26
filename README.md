> [!IMPORTANT]  
> Work in progress

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/othneildrew/Best-README-Template">
    <img src="public/cardano_logo.png" alt="Logo" width="320" height="65">
  </a>

<h3 align="center">Cardano Card Gateway</h3>

</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

Blueprint codebase for accepting card payments for digital assets on the Cardano blockchain.
This is a NextJs repo that includes a payment processor and smart contracts to accept credit card payments for NFTs
and other digital payments.


**Workflow:**
- Payments are accepted through `wert.io`
- A token is minted against payment on the Polygon blockchain
- The backend monitors for payments and once payment received
- The backend sends the buyer a token on the Cardano blockchain


### Demo
Demo of a sample shop-front with a "Pay with Card" button will be shown here

<a href="https://cardgateway.work.gd">cardgateway.work.gd</a>

### Built With

Major frameworks/libraries used in this project.

* [![Next][Next.js]][Next-url]




<!-- GETTING STARTED -->
## Getting Started


### Prerequisites

This is an example of how to list things you need to use the software and how to install them.
* npm
  ```sh
  
  ```

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/dynamicstrategies/cardano-card-gateway.git
   ```
2. Install NPM packages
   ```sh
   npm install
   ```
   
3. Run the dev environment
    ```sh

   ```


<!-- USAGE EXAMPLES -->
## Usage

Get the Metamask Browser Extension
Create a wallet and connect to the Polygon Amoy network. You can use this website to do this
```shell
https://chainlist.org/chain/80002
```

Get test "POL" token from this faucet `https://faucet.polygon.technology/`
You will need to connect with your Discord server to request the test tokens on the website


## Deploy EVM Smart Contract
Access Remix `https://remix.ethereum.org/`


## Testing

Test with card details as described here `https://docs.wert.io/docs/sandbox`


<!-- LICENSE -->
## License

Distributed under the Apache 2.0 License See `LICENSE.txt` for more information.



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments




<!-- MARKDOWN LINKS & IMAGES -->
[product-screenshot]: images/screenshot.png
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/

