import { useEffect, useState } from 'react'
import { readStorageJson, writeStorageJson } from '../lib/storage'

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStorageJson(key, initialValue))

  useEffect(() => {
    writeStorageJson(key, value)
  }, [key, value])

  return [value, setValue] as const
}
