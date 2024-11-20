import { Elysia, t } from "elysia";
import { cors } from '@elysiajs/cors';
import { createMintUrl, createSignedPOD, mintPOD } from "./utils";
import { POD, PODEntries, podEntriesFromJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreSignaturePCD, SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { PODStore, ServerConfig } from "./types";

// Define site config
const siteConfig = {
  zupass_display: "Example POD",
  zupass_title: "Test POD",
  zupass_image_url: "https://example.com/image.png",
  issuer: "Test Issuer"
};

// Define the server config
const serverConfig: ServerConfig = {
  hostname: process.env.HOSTNAME || "localhost",
  port: parseInt(process.env.PORT || "4000"),
  mintUrl: process.env.MINT_URL || "https://lastlightbringer.xyz/api/sign",
  zupassUrl: process.env.ZUPASS_URL || "https://zupass.org",
  defaultPrivateKey: process.env.DEFAULT_PRIVATE_KEY || "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
};

// Use the same key for signing
const SIGNING_KEY = process.env.SIGNING_KEY || "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="

// At the top of your file
const podStore: PODStore = {};

// Function to save PODs (you'll need to implement this based on your storage needs)
const savePODs = async (store: PODStore) => {
  // Save to file/database
};

const app = new Elysia()
  .use(cors({
    origin: ['https://zupass.org'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
  }))
  .get("/", () => "Hello Elysia")
  // First endpoint: Create POD from body data
  .post("/create-pod", 
    async ({ body }) => {
      try {
        // Create POD entries from JSON
        const podEntries = podEntriesFromJSON({
          zupass_display: siteConfig.zupass_display,
          zupass_title: siteConfig.zupass_title,
          zupass_image_url: siteConfig.zupass_image_url,
          timestamp: new Date().toISOString(),
          issuer: siteConfig.issuer,
          ...body.data  
        });

        const mintUrlGenerator = createMintUrl(serverConfig);
        const pod = createSignedPOD(podEntries, SIGNING_KEY);
        const mintLink = await mintUrlGenerator(pod, body.folderName);
        
        // Store the POD data
        podStore[pod.contentID.toString(16)] = {
          podEntries,
          signerPrivateKey: SIGNING_KEY,
          podFolder: body.folderName,
          mintLink
        };

        // Save PODs to persistent storage if needed
        await savePODs(podStore);
        
        return { 
          success: true, 
          mintLink,
          contentID: pod.contentID.toString(16)  // Return contentID to client
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return { success: false, error: errorMessage };
      }
    }, 
    {
      body: t.Object({
        data: t.Record(t.String(), t.Any()),
        folderName: t.String()
      })
    }
  )
  // Second endpoint: Sign endpoint matching pod-issuer implementation
  .post("/api/sign",
    async ({ body }) => {
      try {
        const contentIDString = body.contentID;

        if (!body.semaphoreSignaturePCD?.pcd) {
          throw new TypeError("Missing Semaphore Signature PCD");
        }

        const pcd = await SemaphoreSignaturePCDPackage.deserialize(
          body.semaphoreSignaturePCD.pcd
        ) as SemaphoreSignaturePCD;

        // Get the stored POD request
        const podSignRequest = podStore[contentIDString];
        if (!podSignRequest) {
          throw new Error("Invalid content ID");
        }

        // Debug logging of raw message
        console.log('Raw signed message:', pcd.claim.signedMessage);
        
        let signedMessage;
        try {
          signedMessage = JSON.parse(pcd.claim.signedMessage);
        } catch (e) {
          console.error('Failed to parse signed message:', e);
          console.log('Message length:', pcd.claim.signedMessage.length);
          throw new Error(`Invalid signed message format: ${(e as Error).message}`);
        }

        console.log('Parsed signed message:', signedMessage);
        console.log('Current time:', Date.now());
        console.log('Signature time:', signedMessage.timestamp);
        
        // Create new POD entries with all the original fields plus owner and timestamp
        const finalPodEntries: PODEntries = {
          ...podSignRequest.podEntries,  // Include all original entries
          owner: {
            type: "cryptographic",
            value: BigInt(pcd.claim.identityCommitment)
          },
          timestamp: {
            type: "string",
            value: new Date().toISOString()
          }
        };

        // Create the final POD with all entries
        const mintedPOD = POD.sign(finalPodEntries, SIGNING_KEY);
        
        const mintedPODPCD = new PODPCD(crypto.randomUUID(), mintedPOD);
        const serializedPODPCD = await PODPCDPackage.serialize(mintedPODPCD);
        
        return serializedPODPCD;
      } catch (error: unknown) {
        return new Response(String(error), { status: 400 });
      }
    },
    {
      body: t.Object({
        contentID: t.String(),
        semaphoreSignaturePCD: t.Object({
          pcd: t.String()
        })
      })
    }
  )
  .listen(serverConfig.port);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);