import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { Readable } from "node:stream";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));

vi.mock("@aws-sdk/client-s3", () => {
  class FakeCommand {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  }
  class PutObjectCommand extends FakeCommand {}
  class ListObjectsV2Command extends FakeCommand {}
  class DeleteObjectCommand extends FakeCommand {}
  class GetObjectCommand extends FakeCommand {}
  class S3Client {
    config: Record<string, unknown>;
    send = mockSend;
    constructor(config: Record<string, unknown>) {
      this.config = config;
    }
  }
  return { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand };
});

const { createS3Destination } = await import("@/lib/backup-destinations/s3");
const { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = await import("@aws-sdk/client-s3");

const config = {
  endpoint: "https://s3.example.test",
  bucket: "clinic-backups-bucket",
  region: "us-east-1",
  accessKeyId: "AKIA_TEST",
  secretAccessKey: "secret_test",
};

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "s3-adapter-test-"));
  mockSend.mockReset();
});

describe("createS3Destination", () => {
  it("uploads under the clinic-backups/ prefix", async () => {
    mockSend.mockResolvedValueOnce({});
    const filePath = path.join(tempDir, "file.enc");
    fs.writeFileSync(filePath, "encrypted-content");

    const adapter = createS3Destination(config);
    await adapter.upload(filePath, "backup-1.db.enc");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input.Bucket).toBe("clinic-backups-bucket");
    expect(command.input.Key).toBe("clinic-backups/backup-1.db.enc");
  });

  it("lists objects and strips the prefix from remoteName", async () => {
    mockSend.mockResolvedValueOnce({
      Contents: [
        { Key: "clinic-backups/a.db.enc", Size: 10, LastModified: new Date("2026-01-01") },
        { Key: "clinic-backups/b.db.enc", Size: 20, LastModified: new Date("2026-01-02") },
      ],
    });

    const adapter = createS3Destination(config);
    const result = await adapter.list();

    expect(result).toEqual([
      { remoteName: "a.db.enc", sizeBytes: 10, modifiedAt: new Date("2026-01-01") },
      { remoteName: "b.db.enc", sizeBytes: 20, modifiedAt: new Date("2026-01-02") },
    ]);
    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(ListObjectsV2Command);
    expect(command.input.Prefix).toBe("clinic-backups/");
  });

  it("deletes using the prefixed key", async () => {
    mockSend.mockResolvedValueOnce({});
    const adapter = createS3Destination(config);
    await adapter.remove("a.db.enc");

    const command = mockSend.mock.calls[0][0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input.Key).toBe("clinic-backups/a.db.enc");
  });

  it("downloads the object body to localPath", async () => {
    const content = Buffer.from("secret-encrypted-content");
    mockSend.mockResolvedValueOnce({ Body: Readable.from([content]) });

    const adapter = createS3Destination(config);
    const destPath = path.join(tempDir, "downloaded.enc");
    await adapter.download("a.db.enc", destPath);

    expect(fs.readFileSync(destPath)).toEqual(content);
  });
});
