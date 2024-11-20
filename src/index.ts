import { Elysia, t } from "elysia";
import { cors } from '@elysiajs/cors';
import { createMintUrl, createSignedPOD, mintPOD } from "./utils";
import { POD, PODEntries, podEntriesFromJSON } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";
import { SemaphoreSignaturePCD, SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { ServerConfig } from "./types";

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
  port: parseInt(process.env.PORT || "3000"),
  mintUrl: process.env.MINT_URL || "http://localhost:3000/api/sign",
  zupassUrl: process.env.ZUPASS_URL || "https://zupass.org",
  defaultPrivateKey: process.env.DEFAULT_PRIVATE_KEY || "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
};

// Use the same key for signing
const SIGNING_KEY = process.env.SIGNING_KEY || "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="

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
        
        return { success: true, mintLink };
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

        // TODO: Timestamp check for Semaphore signature PCD.

        const mintedPOD = await mintPOD(
          contentIDString,
          pcd
        );

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