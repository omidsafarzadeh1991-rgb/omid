import SftpClient from "ssh2-sftp-client";
import type { BackupDestinationAdapter, RemoteBackup } from "@/lib/backup-destinations/types";

export type SftpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  remotePath: string;
};

/** For sending backups to the clinic's own server/NAS - never leaves their infrastructure. */
export function createSftpDestination(config: SftpConfig): BackupDestinationAdapter {
  async function withClient<T>(fn: (client: SftpClient) => Promise<T>): Promise<T> {
    const client = new SftpClient();
    try {
      await client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
      });
      await client.mkdir(config.remotePath, true).catch(() => undefined);
      return await fn(client);
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  function remotePathFor(remoteName: string): string {
    return `${config.remotePath.replace(/\/+$/, "")}/${remoteName}`;
  }

  return {
    async upload(localPath, remoteName) {
      await withClient((client) => client.fastPut(localPath, remotePathFor(remoteName)));
    },

    async list(): Promise<RemoteBackup[]> {
      return withClient(async (client) => {
        const entries = await client.list(config.remotePath);
        return entries
          .filter((entry) => entry.type === "-")
          .map((entry) => ({
            remoteName: entry.name,
            sizeBytes: entry.size,
            modifiedAt: new Date(entry.modifyTime),
          }));
      });
    },

    async remove(remoteName) {
      await withClient((client) => client.delete(remotePathFor(remoteName)));
    },

    async download(remoteName, localPath) {
      await withClient((client) => client.fastGet(remotePathFor(remoteName), localPath));
    },
  };
}
