type LocalesDict = string | { [property: string]: LocalesDict }

export interface LocalesTemplate {
  commands: {
    [property: string]: {
      [property: string]: string
      description: string
      usage?: string
      example?: string
      options?: {
        [property: string]: string
      }
      shortcut?: {
        [property: string]: string
      }
    }
  }
  [property: string]: LocalesDict
}