import { ServerConfig } from "./types";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { POD, PODEntries, podEntriesFromJSON } from "@pcd/pod";
import { v4 as uuid } from "uuid";
import { SemaphoreSignaturePCD, SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";

// TODO: Replace with constructZupassPcdAddRequestUrl.
/**
 * Creates a mint link from an ownerless POD and a folder name.
 */
export const createMintUrl =
  (serverConfig: ServerConfig) =>
  async (pod: POD, podFolder: string): Promise<string> => {
    const zupassClientUrl = serverConfig.zupassUrl;
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
    return `${zupassClientUrl}#/add?request=${eqReq}`;
  };

// Helper function to create and sign a new POD
export const createSignedPOD = (entries: PODEntries, signingKey: string): POD => {
  return POD.sign(entries, signingKey);
};

// Function to mint a POD with a Semaphore Signature PCD
export const mintPOD = async (
  contentID: string,
  pcd: SemaphoreSignaturePCD
): Promise<POD> => {
  // Create POD entries
  const podEntries = podEntriesFromJSON({
    contentID,
    timestamp: new Date().toISOString(),
    // Add any other necessary fields
    owner: pcd.claim.identityCommitment.toString()
  });

  // Create and sign the POD
  return createSignedPOD(podEntries, "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=");
};

  