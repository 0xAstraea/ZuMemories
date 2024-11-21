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

export interface MemoryStructured {
  title: string;
  overview: string;
  emoji: string;
  category: string;
  actionItems: any[];
  events: any[];
}

export interface MemoryRequest {
  id: string;
  created_at: string;
  structured: MemoryStructured;
  started_at: string;
  finished_at: string;
  transcript_segments: any[];
  plugins_results: any[];
  geolocation: null;
  photos: any[];
  discarded: boolean;
  deleted: boolean;
  source: string;
  language: string;
  external_data: null;
  status: string;
}
