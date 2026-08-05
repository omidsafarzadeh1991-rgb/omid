/**
 * Shared contract for offsite backup destinations. Adding a new destination
 * (e.g. a different cloud provider) only means adding a new adapter here,
 * never touching lib/backup-offsite.ts.
 */
export type RemoteBackup = {
  remoteName: string;
  sizeBytes: number;
  modifiedAt: Date;
};

export interface BackupDestinationAdapter {
  /** Uploads localPath, storing it remotely under remoteName. */
  upload(localPath: string, remoteName: string): Promise<void>;
  /** Lists all backup files currently at the destination, oldest or newest first (order not guaranteed). */
  list(): Promise<RemoteBackup[]>;
  /** Deletes a remote backup by its remoteName (as returned by list()). */
  remove(remoteName: string): Promise<void>;
  /** Downloads the given remote backup to localPath. */
  download(remoteName: string, localPath: string): Promise<void>;
}
