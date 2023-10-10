import React, { useContext, useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import JSONPretty from "react-json-pretty";
import { SubmitHandler, useForm } from "react-hook-form";
import { BACKEND_URL, EASConfigContext } from "./EASConfigContext";
import { useAccount, useWalletClient } from "wagmi";
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { Web3Provider } from "@ethersproject/providers";
import { BrowserProvider } from "ethers";

type SupportedAttestationTypes = "metIRL" | "resume";
type FormInputs = {
  recipientAddress: string;
};
export default function AdminCreateAttestation() {
  const { address } = useWallet();
  const { connector } = useAccount();

  const { data: walletClient } = useWalletClient();

  const [attesting, setAttesting] = useState(false);
  const [jsonResponse, setJsonResponse] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormInputs>();

  const {
    chainId: easChainId,
    contractAddress,
    metIrlSchema,
  } = useContext(EASConfigContext);

  if (!address || address.length === 0) {
    return (
      <div>
        You must be connected w/ a browser wallet to create an attestation
      </div>
    );
  }
  if (easChainId === 0) {
    return <div>Could not find EAS config for the current chain</div>;
  }

  if (!walletClient || !connector) {
    return <div>Wallet client or connector is not connected</div>;
  }

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    setAttesting(true);
    try {
      console.log("EAR contract address", contractAddress);
      // const eas = new EAS(contractAddress);
      // const eas = new EAS("0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587");
      const eas = new EAS("0xC2679fBD37d54388Ce493F1DB75320D236e1815e");

      // const signer = await walletClientToSigner(walletClient);
      console.log("eas: ", eas);
      console.log("Connecting to EAS");
      // console.log("signer", signer);
      const { account, chain, transport } = walletClient;
      console.log("walletClientToSignerFORM", walletClient);
      if (chain.id !== easChainId) {
        throw new Error(
          `The chain is ${easChainId} according to context, but the walletClient is connected to ${chain.id}`,
        );
      }
      const network = {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
      };
      const provider = new BrowserProvider(transport, network);
      const signer = await provider.getSigner(account.address);

      console.log("provider: ", signer);
      if (!signer) {
        console.log("No signer, getting signer");
        return;
      }
      eas.connect(signer);
      console.log("eas2: ", eas);
      console.log("eas3: ", eas.contract);
      // console.log("eas4: ", eas.contract.provider)

      console.log("Getting offchain");
      console.log(await eas.getChainId());
      console.log(await eas.getVersion());
      console.log(await eas.contract.getAddress());
      const offchain = await eas.getOffchain();

      console.log("Encoding schema");
      // TODO, I feel like we could download the schema from the chain
      // TODO Also, we could use an EAS registry that the user isn't signed into here. We'd only need to read the schema
      const schemaEncoder = new SchemaEncoder("bool metIRL");
      const encoded = schemaEncoder.encodeData([
        { name: "metIRL", type: "bool", value: true },
      ]);

      const time = Math.floor(Date.now() / 1000);
      console.log("Signing attestation")
      const offchainAttestation = await offchain.signOffchainAttestation(
        {
          recipient: data.recipientAddress.toLowerCase(),
          // Unix timestamp of when attestation expires. (0 for no expiration)
          expirationTime: 0n,
          // Unix timestamp of current time
          time: BigInt(time),
          revocable: true,
          version: 1,
          nonce: 0n, //TODO Populate with actual schema
          schema: metIrlSchema,
          //This field is for when you're referencing another attestation. For us, it's unset because this attestation is new.
          refUID:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          data: encoded,
        },
        signer,
      );
      // un-comment the below to process an on-chain timestamp
      // console.log("Adding an on-chain timestamp")
      // const transaction = await eas.timestamp(offchainAttestation.uid);
      // // Optional: Wait for the transaction to be validated
      // await transaction.wait();
      // ts ignore nextline because Bigint doesn't have toJSON as a function
      // @ts-ignore-next-line
      BigInt.prototype.toJSON = function() { return this.toString() }
      const requestBody = {
        ...offchainAttestation,
        account: address.toLowerCase(),
        attestationType: "met_irl",
      };
      console.log(address);
      const requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      };
      // call attest api endpoint to store attestation on ComposeDB
      const res = await fetch(`${BACKEND_URL}/eas/attest`, requestOptions).then(
        (response) => response.json(),
      );
      setJsonResponse(res);
      console.log("Attested", res);
      setAttesting(false);
    } catch (e) {
      console.log("Failed to attest", e);
    }
    setAttesting(false);
  };

  return (
    <div className="Container">
      <div className="GradientBar" />
      <div className="WhiteBox">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="Title">
            I <b>attest</b> that I met
          </div>

          <input {...register("recipientAddress", { required: true })} />
          {/* errors will return when field validation fails  */}
          {errors.recipientAddress && <span>This field is required</span>}
          <input type={"submit"} />
        </form>
        {attesting
          ? "Attesting..."
          : "Waiting for form submission to create attestation"}

        <div>
          <h2>Response</h2>
          {errorMessage && <div className="Error">{errorMessage}</div>}
          <JSONPretty id="json-pretty" data={jsonResponse}></JSONPretty>
        </div>

        <div>
          <h2>Attestations you've issued</h2>
          TODO, will put a table here
        </div>
      </div>
    </div>
  );
}
