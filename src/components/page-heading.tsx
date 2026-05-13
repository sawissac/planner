"use client"

import { useEffect, useRef, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { renameFile } from "@/lib/todoSlice"

export function PageHeading() {
  const activeFile = useAppSelector((s) => {
    const id = s.todos.activeFileId
    return s.todos.files.find((f) => f.id === id) ?? null
  })
  const dispatch = useAppDispatch()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  if (!activeFile) {
    return <h1 className="text-2xl font-semibold text-muted-foreground">No file</h1>
  }

  const commit = () => {
    const n = draft.trim()
    if (n && n !== activeFile.name) {
      dispatch(renameFile({ id: activeFile.id, name: n }))
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        onBlur={commit}
        className="text-2xl font-semibold bg-transparent outline-none border-b border-primary"
      />
    )
  }

  return (
    <h1
      className="text-2xl font-semibold cursor-text hover:bg-muted/50 rounded px-1 -mx-1 inline-block"
      onClick={() => {
        setDraft(activeFile.name)
        setEditing(true)
      }}
      title="Click to rename"
    >
      {activeFile.name}
    </h1>
  )
}
