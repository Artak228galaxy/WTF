import { expect, test, vi } from "vitest";
import { PublicClient } from "../clients/index.js";
import { WalletV1 } from "../contracts/index.js";
import { LocalECDSAKeySigner, generateRandomPrivateKey } from "../signers/index.js";
import { MockTransport } from "../transport/MockTransport.js";
import { getContract } from "./ContractFactory.js";

const abi = [
  {
    inputs: [{ internalType: "uint256", name: "start", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "counter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCounter",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getReceived",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  { inputs: [], name: "increment", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "receiveMoney", outputs: [], stateMutability: "payable", type: "function" },
  { inputs: [], name: "receiveToken", outputs: [], stateMutability: "payable", type: "function" },
  {
    inputs: [{ internalType: "uint256", name: "_counter", type: "uint256" }],
    name: "setCounter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
const bin =
  "0x6080604052348015600e575f5ffd5b506040516106373803806106378339818101604052810190602e9190606b565b805f81905550506091565b5f5ffd5b5f819050919050565b604d81603d565b81146056575f5ffd5b50565b5f815190506065816046565b92915050565b5f60208284031215607d57607c6039565b5b5f6088848285016059565b91505092915050565b6105998061009e5f395ff3fe60806040526004361061006f575f3560e01c80638ada066e1161004d5780638ada066e146100d15780638bb5d9c3146100fb578063d09de08a14610123578063e9ba77fb146101395761006f565b806355d0ad181461007357806361bc221a1461009d5780636d26ec18146100c7575b5f5ffd5b34801561007e575f5ffd5b50610087610143565b6040516100949190610247565b60405180910390f35b3480156100a8575f5ffd5b506100b161014c565b6040516100be9190610247565b60405180910390f35b6100cf610151565b005b3480156100dc575f5ffd5b506100e561015a565b6040516100f29190610247565b60405180910390f35b348015610106575f5ffd5b50610121600480360381019061011c919061029b565b610162565b005b34801561012e575f5ffd5b5061013761016b565b005b610141610183565b005b5f600154905090565b5f5481565b34600181905550565b5f5f54905090565b805f8190555050565b5f5f81548092919061017c906102f3565b9190505550565b5f61018c6101b6565b9050805f815181106101a1576101a061033a565b5b60200260200101516020015160028190555050565b606060d373ffffffffffffffffffffffffffffffffffffffff16638ee83f196040518163ffffffff1660e01b81526004015f604051808303815f875af1158015610202573d5f5f3e3d5ffd5b505050506040513d5f823e3d601f19601f8201168201806040525081019061022a919061051c565b905090565b5f819050919050565b6102418161022f565b82525050565b5f60208201905061025a5f830184610238565b92915050565b5f604051905090565b5f5ffd5b5f5ffd5b61027a8161022f565b8114610284575f5ffd5b50565b5f8135905061029581610271565b92915050565b5f602082840312156102b0576102af610269565b5b5f6102bd84828501610287565b91505092915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f6102fd8261022f565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361032f5761032e6102c6565b5b600182019050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6103b18261036b565b810181811067ffffffffffffffff821117156103d0576103cf61037b565b5b80604052505050565b5f6103e2610260565b90506103ee82826103a8565b919050565b5f67ffffffffffffffff82111561040d5761040c61037b565b5b602082029050602081019050919050565b5f5ffd5b5f5ffd5b5f8151905061043481610271565b92915050565b5f6040828403121561044f5761044e610422565b5b61045960406103d9565b90505f61046884828501610426565b5f83015250602061047b84828501610426565b60208301525092915050565b5f610499610494846103f3565b6103d9565b905080838252602082019050604084028301858111156104bc576104bb61041e565b5b835b818110156104e557806104d1888261043a565b8452602084019350506040810190506104be565b5050509392505050565b5f82601f83011261050357610502610367565b5b8151610513848260208601610487565b91505092915050565b5f6020828403121561053157610530610269565b5b5f82015167ffffffffffffffff81111561054e5761054d61026d565b5b61055a848285016104ef565b9150509291505056fea264697066735822122054cea025db69a2013a1cbc02a4e506f06e6dd509a99d07a7983c47f2ab03538c64736f6c634300081b0033";

const signer = new LocalECDSAKeySigner({
  privateKey: generateRandomPrivateKey(),
});
const pubkey = await signer.getPublicKey();

let deployed = false;

const fn = vi.fn((param) => {
  if (param.method === "eth_getBalance") {
    return "0xeeeeeee";
  }
  if (param.method === "eth_getCode") {
    if (deployed) {
      return bin;
    }
    deployed = true;
    return "";
  }
  if (param.method === "eth_call") {
    return {
      data: "0x0000000000000000000000000000000000000000000000000000000000000000",
    };
  }
  if (param.method === "eth_sendRawTransaction") {
    return "0x0000000000000000000000000000000000000000000000000000000000000000";
  }
  return "0x0";
});

const client = new PublicClient({
  transport: new MockTransport(fn),
  shardId: 1,
});

const wallet = new WalletV1({
  pubkey: pubkey,
  salt: 100n,
  shardId: 1,
  client,
  signer,
});

test("Contract Factory", async () => {
  await wallet.selfDeploy(true);
  await wallet.deployContract({
    shardId: 1,
    salt: BigInt(1),
    abi,
    args: [0n],
    bytecode: bin,
    feeCredit: 50000000n,
  });

  // read case
  const contract = getContract({
    client,
    abi,
    address: "0x00013dc0a0533a7125e9150876a852698686ff43",
    wallet: wallet,
  });
  // @ts-ignore
  const res = await contract.read.getCounter();
  expect(res).to.equal(BigInt(0));

  // write
  const res2 = await contract.write.setCounter([BigInt(100)]);
  expect(res2).to.toHaveLength(66);
});