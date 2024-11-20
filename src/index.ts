import { Elysia, t } from "elysia";
import { createMintUrl, createSignedPOD } from "./utils";
import { PODEntries } from "@pcd/pod";
import { ServerConfig } from "./types";
// Define the server config
const serverConfig: ServerConfig = {
  hostname: process.env.HOSTNAME || "localhost",
  port: parseInt(process.env.PORT || "3000"),
  mintUrl: process.env.MINT_URL || "https://issuer.zupass.org",
  zupassUrl: process.env.ZUPASS_URL || "https://zupass.org",
  defaultPrivateKey: process.env.DEFAULT_PRIVATE_KEY || "your-default-private-key",
};

// Define the signing key (should be in env variables in production)
const SIGNING_KEY = process.env.SIGNING_KEY || "your-default-signing-key";

const app = new Elysia()
  .get("/", () => "Hello Elysia")
  .post("/create-pod", 
    async ({ body }) => {
      try {
        const podEntries: PODEntries = {
          name: {
            type: "string",
            value: body.entries.name.value
          },
          pod_type: {
            type: "string",
            value: body.entries.pod_type.value
          }
        };

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
        entries: t.Object({
          name: t.Object({
            type: t.String(),
            value: t.String()
          }),
          pod_type: t.Object({
            type: t.String(),
            value: t.String()
          })
        }),
        folderName: t.String()
      })
    }
  )
  .listen(serverConfig.port);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);