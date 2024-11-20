import { PODEntries } from "@pcd/pod";

export type ServerConfig = {
  hostname: string;
  port: number;
  mintUrl: string;
  zupassUrl: string;
  defaultPrivateKey: string;
};

export interface PODStore {
  [contentId: string]: {
    podEntries: PODEntries;
    signerPrivateKey: string;
    podFolder: string;
    mintLink: string;
    nullifiers?: {
      [nullifierHash: string]: boolean;
    };
  }
}
