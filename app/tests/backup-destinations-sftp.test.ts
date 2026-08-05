import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockConnect, mockList, mockFastPut, mockFastGet, mockDelete, mockMkdir, mockEnd } = vi.hoisted(() => ({
  mockConnect: vi.fn(),
  mockList: vi.fn(),
  mockFastPut: vi.fn(),
  mockFastGet: vi.fn(),
  mockDelete: vi.fn(),
  mockMkdir: vi.fn(),
  mockEnd: vi.fn(),
}));

vi.mock("ssh2-sftp-client", () => ({
  default: vi.fn().mockImplementation(function FakeSftpClient() {
    return {
      connect: mockConnect,
      list: mockList,
      fastPut: mockFastPut,
      fastGet: mockFastGet,
      delete: mockDelete,
      mkdir: mockMkdir,
      end: mockEnd,
    };
  }),
}));

const { createSftpDestination } = await import("@/lib/backup-destinations/sftp");

const config = {
  host: "nas.local",
  port: 22,
  username: "clinic",
  password: "secret-password",
  remotePath: "/backups/clinic",
};

beforeEach(() => {
  mockConnect.mockReset().mockResolvedValue(undefined);
  mockList.mockReset();
  mockFastPut.mockReset().mockResolvedValue("ok");
  mockFastGet.mockReset().mockResolvedValue("ok");
  mockDelete.mockReset().mockResolvedValue("ok");
  mockMkdir.mockReset().mockResolvedValue("ok");
  mockEnd.mockReset().mockResolvedValue(true);
});

describe("createSftpDestination", () => {
  it("connects, ensures the remote dir exists, uploads, then disconnects", async () => {
    const adapter = createSftpDestination(config);
    await adapter.upload("/local/file.enc", "backup-1.db.enc");

    expect(mockConnect).toHaveBeenCalledWith({
      host: "nas.local",
      port: 22,
      username: "clinic",
      password: "secret-password",
    });
    expect(mockMkdir).toHaveBeenCalledWith("/backups/clinic", true);
    expect(mockFastPut).toHaveBeenCalledWith("/local/file.enc", "/backups/clinic/backup-1.db.enc");
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });

  it("lists only files (not directories), mapped to RemoteBackup", async () => {
    mockList.mockResolvedValue([
      { type: "-", name: "a.db.enc", size: 10, modifyTime: 1700000000000 },
      { type: "d", name: "subdir", size: 0, modifyTime: 1700000000000 },
    ]);

    const adapter = createSftpDestination(config);
    const result = await adapter.list();

    expect(result).toEqual([{ remoteName: "a.db.enc", sizeBytes: 10, modifiedAt: new Date(1700000000000) }]);
  });

  it("removes using the prefixed remote path", async () => {
    const adapter = createSftpDestination(config);
    await adapter.remove("a.db.enc");
    expect(mockDelete).toHaveBeenCalledWith("/backups/clinic/a.db.enc");
  });

  it("downloads using the prefixed remote path", async () => {
    const adapter = createSftpDestination(config);
    await adapter.download("a.db.enc", "/local/out.enc");
    expect(mockFastGet).toHaveBeenCalledWith("/backups/clinic/a.db.enc", "/local/out.enc");
  });

  it("still disconnects when an operation throws", async () => {
    mockFastPut.mockRejectedValue(new Error("connection reset"));
    const adapter = createSftpDestination(config);

    await expect(adapter.upload("/local/file.enc", "x.enc")).rejects.toThrow("connection reset");
    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
