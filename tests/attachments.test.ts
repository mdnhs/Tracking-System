import assert from "node:assert/strict"
import { existsSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"

process.chdir(mkdtempSync(path.join(tmpdir(), "tracksys-test-")))
const { readAttachment, removeAttachment, saveAttachment } =
  await import("@/lib/attachments")

test("save, read and remove round-trip with a sanitised name", async () => {
  const file = new File(["hello"], "../../etc/pa ss<wd>.txt", {
    type: "text/plain",
  })
  const meta = await saveAttachment("T-101", file, "MD")
  assert.equal(meta.name, "pa ss_wd_.txt")
  assert.equal(meta.size, 5)
  assert.equal((await readAttachment("T-101", meta.id)).toString(), "hello")
  await removeAttachment("T-101", meta.id)
  assert.equal(existsSync(`.data/uploads/T-101/${meta.id}`), false)
})

test("rejects ids that could traverse", async () => {
  await assert.rejects(
    readAttachment("../T-1", "00000000-0000-0000-0000-000000000000")
  )
  await assert.rejects(readAttachment("T-101", "../../data.json"))
})
