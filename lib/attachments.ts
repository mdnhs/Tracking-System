import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import type { Attachment } from "@/lib/types"

const UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads")
const TASK_ID = /^T-\d+$/
const FILE_ID = /^[0-9a-f-]{36}$/

function filePath(taskId: string, fileId: string): string {
  // Both ids end up in a filesystem path, so reject anything that could traverse.
  if (!TASK_ID.test(taskId) || !FILE_ID.test(fileId)) {
    throw new Error("Invalid attachment id")
  }
  return path.join(UPLOAD_DIR, taskId, fileId)
}

function safeName(name: string): string {
  const base = path
    .basename(name)
    .replace(/[^\w.\- ()]/g, "_")
    .trim()
  return base.slice(-120) || "file"
}

export async function saveAttachment(
  taskId: string,
  file: File,
  uploadedBy: string
): Promise<Attachment> {
  const id = randomUUID()
  const target = filePath(taskId, id)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, Buffer.from(await file.arrayBuffer()))
  return {
    id,
    name: safeName(file.name),
    size: file.size,
    type: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
    uploadedBy,
  }
}

export async function readAttachment(
  taskId: string,
  fileId: string
): Promise<Buffer> {
  return fs.readFile(filePath(taskId, fileId))
}

export async function removeAttachment(
  taskId: string,
  fileId: string
): Promise<void> {
  await fs.rm(filePath(taskId, fileId), { force: true })
}
