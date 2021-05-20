import React, {useState, useEffect } from 'react'
import logo from './logo.svg';
import './App.css';
import Web3 from 'web3'
import { Box, Button, Flex } from 'rimble-ui'
const { getTypedData } = require("./meta-tx")
const request = require('request')


const tokenAddresses = {
  "80001": "0x2395d740789d8C27C139C62d1aF786c77c9a1Ef1"
}

let mumbai = new Web3('https://rpc-mumbai.matic.today/'), eth, accounts, chain

async function fillMaticDetails () {
  let _data = await mumbai.eth.abi.encodeFunctionCall({
    name: 'balanceOf',
    type: 'function',
    inputs: [{
      type: 'address',
      name: 'address'
    }]
  }, [accounts[0]]);

  let balanceMumbai = await mumbai.eth.call ({
    to: tokenAddresses["80001"],
    data: _data
  });
}

async function setAccountData(setUserAddress, setChainId, setEthData, setNetworkName, setMumbaiBalance) {
  if (typeof window.ethereum !== 'undefined') {
    accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    let chainArea = document.getElementById("chain")
    chain = await window.ethereum.chainId
    chain = parseInt(chain)
    eth = window.ethereum

    setUserAddress(accounts[0])
    setChainId(chain)
    setEthData(eth)
    networkChange(chain, setNetworkName)

    mumbai.eth.getBalance(accounts[0], function(err, result) {
      if (err) {
        console.log(err)
      } else {
        setMumbaiBalance(mumbai.utils.fromWei(result))
      }
    })
    await fillMaticDetails ()
  }
}

async function executeMetaTx(functionSig) {
  let data = await mumbai.eth.abi.encodeFunctionCall({
    name: 'getNonce',
    type: 'function',
    inputs: [{
      "name": "user",
      "type": "address"
    }]
  }, [accounts[0]])
  let _nonce = await mumbai.eth.call ({
    to: tokenAddresses["80001"],
    data
  });
  const dataToSign = getTypedData({
    name: 'prueba',
    version: '1',
    salt: '0x0000000000000000000000000000000000000000000000000000000000013881',
    verifyingContract: tokenAddresses["80001"],
    nonce: parseInt(_nonce),
    from: accounts[0],
    functionSignature: functionSig
  })
  const msgParams = [accounts[0], JSON.stringify(dataToSign)]
  let sign = await eth.request ({
    method: 'eth_signTypedData_v3',
    params: msgParams
  })
  const { r, s, v } = getSignatureParameters(sign)
  return {
    sig: sign,
    r,
    s,
    v,
  }
}

async function approve(setUserAddress, setFunctionSignature, setE1) {
  setUserAddress(accounts[0])
  const amt = "10"
  let data = await mumbai.eth.abi.encodeFunctionCall({
    name: 'approve',
    type: 'function',
    inputs: [
      {
        "name": "spender",
        "type": "address"
      },
      {
        "name": "amount",
        "type": "uint256"
      }
    ]
  }, [accounts[0], amt])

  let { sig, r, s, v } = await executeMetaTx (data)

  setFunctionSignature(sig)

  let tx = {
    intent: sig,
    fnSig: data,
    from: accounts[0],
    contractAddress: tokenAddresses["80001"]
  }

  await executeAndDisplay (
      tx,
      'result-approve',
      setE1
  )
}

async function executeAndDisplay(txObj, el, setE1) {
  const response = await request.post(
      'http://localhost:8000/exec', {
        json: txObj,
      },
      (error, res, body) => {
        if (error) {
          console.error(error)
          return
        }
        setE1(body)
      }
  )
}

function networkChange(networkId, setNetworkName) {
  if (networkId === 80001) {
    setNetworkName('Matic Mumbai Testnet')
  } else if (networkId === 5) {
    setNetworkName('Goerli Testnet')
  } else if (networkId === 1) {
    setNetworkName('Ethereum Mainnet')
  } else if (networkId === 3) {
    setNetworkName('Ropsten Testnet')
  } else if (networkId === 4) {
    setNetworkName('Rinkeby Testnet')
  } else if (networkId === 42) {
    setNetworkName('Kovan Testnet')
  } else {
    setNetworkName('Unidentified Network')
  }
}

const getSignatureParameters = (signature) => {
  if (!mumbai.utils.isHexStrict(signature)) {
    throw new Error(
        'Given value "'.concat(signature, '" is not a valid hex string.')
    );
  }
  var r = signature.slice(0, 66);
  var s = "0x".concat(signature.slice(66, 130));
  var v = "0x".concat(signature.slice(130, 132));
  v = mumbai.utils.hexToNumber(v);
  if (![27, 28].includes(v)) v += 27;
  return {
    r: r,
    s: s,
    v: v,
  };
};
function App() {
  const [userAddress, setUserAddress] = useState('')
  const [chainId, setChainId] = useState(0)
  const [ethData, setEthData] = useState('')
  const [functionSignature, setFunctionSignature] = useState('')
  const [e1, setE1] = useState({result: ''})
  const [networkName, setNetworkName] = useState('')
  const [mumbaiBalance, setMumbaiBalance] = useState(0)

  useEffect(() => {
    setAccountData(setUserAddress, setChainId, setEthData, setNetworkName, setMumbaiBalance)
  })

  window.addEventListener("load", function() {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', function (accounts) {
        console.log('accountsChanges',accounts);
        setUserAddress(accounts[0])
      });

      // detect Network account change
      window.ethereum.on('networkChanged', function(networkId){
        console.log('networkChanged',networkId);
        setChainId(networkId)
        networkChange(networkId, setNetworkName)
      });
    }
  })

  return (
    <div className="App">
      <Box bg="salmon">
        <h1 className="headings">Cross Network Meta-Transactions Demo</h1>
        <h3>User Address: {userAddress}</h3>
        <h3>Current Network: {networkName}</h3>
        <h3>Chain ID: {chainId}</h3>
        <Button icon="Send" iconpos="right" mainColor="DarkCyan" style={{"margin":10}} onClick={() => {approve(setUserAddress, setFunctionSignature, setE1)}}> Approve </Button>
      </Box>
      <Box bg="black" color="white">
        <h1 className="headings">Matic Mumbai Testnet</h1>
        <h3>Chain ID: 80001</h3>
        <h3>Balance: {mumbaiBalance} ETH</h3>
        <h3>Function Signature: {functionSignature}</h3>
        <h3>Transaction id: {e1.result}</h3>
        <h3 >View transaction <a>https://explorer-mumbai.maticvigil.com/tx/{e1.result}/internal-transactions</a></h3>
      </Box>
    </div>
  );
}

export default App;
