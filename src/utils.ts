import { ServerConfig } from "./types";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { POD, PODEntries } from "@pcd/pod";
import { v4 as uuid } from "uuid";

// Helper function to create and sign a new POD
const createSignedPOD = (entries: PODEntries, signingKey: string): POD => {
  return POD.sign(entries, signingKey);
};

// Function to mint a new POD
const mintPOD = async (
  entries: PODEntries,
  signingKey: string,
  podFolder: string,
  serverConfig: ServerConfig
): Promise<string> => {
  // Create and sign the POD
  const pod = createSignedPOD(entries, signingKey);
  
  // Verify the signature
  if (!pod.verifySignature()) {
    throw new Error("Failed to verify POD signature");
  }

  // Use createMintUrl to generate the URL
  const mintUrlGenerator = createMintUrl(serverConfig);
  return mintUrlGenerator(pod, podFolder);
};

// Create mint URL function
const createMintUrl =
  (serverConfig: ServerConfig) =>
  async (pod: POD, podFolder: string): Promise<string> => {
    const podPCD = new PODPCD(uuid(), pod);
    const serialisedPODPCD = await PODPCDPackage.serialize(podPCD);
    const req = {
      type: "Add",
      mintUrl: serverConfig.mintUrl,
      returnUrl: serverConfig.zupassUrl,
      pcd: serialisedPODPCD,
      folder: podFolder,
      postMessage: false,
      redirectToFolder: true,
    };
    const eqReq = encodeURIComponent(JSON.stringify(req));
    return `${serverConfig.zupassUrl}#/add?request=${eqReq}`;
  };

export { createMintUrl, mintPOD, createSignedPOD };