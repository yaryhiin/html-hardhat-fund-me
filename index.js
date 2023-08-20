import { ethers } from "./ethers-5.1.esm.min.js";
import { abi, contractAddress } from "./constants.js"

const connectBtn = document.querySelector("#connect-btn");
const fundBtn = document.querySelector("#fund-btn");
const balanceBtn = document.querySelector("#balance-btn");
const withdrawBtn = document.querySelector("#withdraw-btn");
const fundersTopBtn = document.querySelector("#fundersTop-btn");

const popup = document.getElementById("popup");

let showList = false;

connectBtn.onclick = connect;
fundBtn.onclick = fund;
withdrawBtn.onclick = withdraw;
balanceBtn.onclick = getBalance;
fundersTopBtn.onclick = fundersTop;

if (window.ethereum) {
    const networkId = await ethereum.request({ method: 'net_version' });
    if (window.ethereum.isConnected()) {
        if (Number(networkId) == 11155111) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const connectedAddress = await signer.getAddress();
            connectBtn.innerHTML = connectedAddress.slice(0, 4) + "..." + connectedAddress.slice(38, 42);
        }
    }
}

async function connect() {
    if (typeof window.ethereum !== "undefined") { // Checking if MetaMask is installed
        const networkId = await ethereum.request({ method: 'net_version' });
        if (Number(networkId) == 11155111) { // Checking if user is on correct network
            await window.ethereum.request({ method: "eth_requestAccounts" }) // Connecting wallet to our website
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const connectedAddress = await signer.getAddress();
            connectBtn.innerHTML = connectedAddress.slice(0, 4) + "..." + connectedAddress.slice(38, 42);
        } else {
            switchChain();
        }
    } else {
        alert("No MetaMask detected! Please install it");
        window.open("https://metamask.io/", "_blank");
    }
}

async function switchChain() {
    try {
        await ethereum.request({ // Requesting to change to correct network
            method: 'wallet_switchEthereumChain',
            params: [{
                chainId: '0xaa36a7', // The hexadecimal representation of the chain ID
            }],
        });
    } catch (error) {
        if (error.code === 4902) { // If user don`t have this network, requesting to add it to Metamask
            addChain();
        } else {
            console.log(error);
        }
    }
}

async function addChain() {
    try {
        await ethereum.request({ // Requesting to add network to Metamask
            method: 'wallet_addEthereumChain',
            params: [{
                chainId: '0xaa36a7', // The hexadecimal representation of the chain ID
                chainName: 'Sepolia Test Network', // Name of the network
                nativeCurrency: {
                    name: 'Sepolia Ethereum',
                    symbol: 'SETH', // Symbol of the currency
                    decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'], // URL of the network's RPC endpoint
                blockExplorerUrls: ['https://sepolia.etherscan.io'], // URL of the network's block explorer
            }],
        });
        console.log('User added the custom network');
    } catch (error) {
        console.log(error);
        alert('Failed to add network');
    }
    switchChain();
}

async function getBalance() {
    if (typeof window.ethereum != "undefined") {
        const balanceEl = document.querySelector("#balance-value")
        balanceEl.innerHTML = "Contract balance: -"
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const balance = await provider.getBalance(contractAddress);
        balanceEl.innerHTML = "Contract balance: " + ethers.utils.formatEther(balance) + " ETH";
    } else {
        alert("No MetaMask detected! Please install it");
        window.open("https://metamask.io/", "_blank");
    }
}

async function fund() {
    const ethAmount = document.querySelector("#ethAmount").value;
    console.log(`Funding with ${ethAmount}`);
    if (typeof window.ethereum !== "undefined") {
        // Provider / connection to the blockchain
        // Signer / wallet / someone with some gas

        // contract that we are interacting with
        // ^ ABI & Address
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer); // Connecting deployer contract
        try {
            const transactionResponse = await contract.fund({ value: ethers.utils.parseEther(ethAmount) });
            // Listen for the tx to be mined
            // Listen for an event
            await listenForTransactionMine(transactionResponse, provider);
            popup.style.display = "none";
            setTimeout(() => {
                popup.innerHTML = `Succesfully funded ${ethAmount} ETH`
                popup.style.display = "flex";
            }, 850);
            setTimeout(() => {
                popup.style.display = "none";
            }, 3000);
        } catch (error) {
            if (error.message.includes("Didn`t send enough!")) {
                popup.style.display = "none";
                setTimeout(() => {
                    popup.innerHTML = `You didnt send enough!`;
                    popup.style.display = "flex";
                }, 850);
                setTimeout(() => {
                    popup.style.display = "none";
                }, 3000);
            } else {
                console.log(error);
            }
        }
    } else {
        alert("No MetaMask detected! Please install it");
        window.open("https://metamask.io/", "_blank");
    }
}

function listenForTransactionMine(transactionResponse, provider) {
    popup.innerHTML = `Minning ${transactionResponse.hash}...`;
    popup.style.display = "flex";
    // return new Promise;
    // Create a listener for the blockchain
    return new Promise((resolve, reject) => { // This promise only returns once the resolve or reject function is called
        provider.once(transactionResponse.hash, (transactionReceipt) => {
            console.log(`Completed with ${transactionReceipt.confirmations} confirmations`)
            resolve(); // Calls only after we get the transaction confirmation
        })
    })
}

async function withdraw() {
    if (typeof window.ethereum != "undefined") {
        console.log("Withdrawing...")
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, abi, signer);
        const balance = await provider.getBalance(contractAddress);
        try {
            const transactionResponse = await contract.withdraw();
            await listenForTransactionMine(transactionResponse, provider);
            popup.style.display = "none";
            setTimeout(() => {
                popup.innerHTML = `Succesfully withdarwed ${ethers.utils.formatEther(balance)} ETH`;
                popup.style.display = "flex";
            }, 850);
            setTimeout(() => {
                popup.style.display = "none";
            }, 3000);
        } catch (error) {
            if (error.message.includes(`"data":"0x81869524"`)) {
                popup.style.display = "none";
                setTimeout(() => {
                    popup.innerHTML = `Withdraw is only available for owner`;
                    popup.style.display = "flex";
                }, 850);
                setTimeout(() => {
                    popup.style.display = "none";
                }, 3000);
            } else {
                console.log(error);
            }
        }
    } else {
        alert("No MetaMask detected! Please install it");
        window.open("https://metamask.io/", "_blank");
    }
}

async function fundersTop() {
    if (typeof window.ethereum != "undefined") {
        const fundersTopEl = document.querySelector("#fundersTop-el");
        if (!showList) {
            fundersTopEl.innerHTML = "";
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(contractAddress, abi, signer);
            let funders = [];
            let i = 0;
            while (true) {
                try {
                    const funderAddress = await contract.getFunder(i);
                    const amountFunded = await contract.getAddressToAmountFunded(funderAddress);
                    funders.push({ address: funderAddress, amount: ethers.utils.formatEther(amountFunded) });
                    i++;
                } catch (error) {
                    break;
                }
            }
            showList = true;
            fundersTopBtn.innerHTML = "Hide funders Top";
            if (funders.length == 0) {
                fundersTopEl.innerHTML = "There is no funders yet. Be the first one 😉";
            } else {
                funders.sort((a, b) => b.amount - a.amount);
                for (let j = 0; j < funders.length; j++) {
                    const funder = funders[j];
                    fundersTopEl.innerHTML += `<p class="list-el">${j+1}) ${funder.address.slice(0, 4) + "..." + funder.address.slice(38, 42)} funded: ${funder.amount} ETH</li>`;
                }
            }
        } else {
            fundersTopEl.innerHTML = "";
            showList = false;
            fundersTopBtn.innerHTML = "Show funders Top";
        }
    } else {
        alert("No MetaMask detected! Please install it");
        window.open("https://metamask.io/", "_blank");
    }
}