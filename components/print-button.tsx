"use client"

import { PrinterIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <HugeiconsIcon
        icon={PrinterIcon}
        strokeWidth={2}
        data-icon="inline-start"
      />
      Print / PDF
    </Button>
  )
}
