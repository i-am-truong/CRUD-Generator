import { plainToInstance } from 'class-transformer'
import { IsNumber, IsNumberString, IsString, validateSync } from 'class-validator'
import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
config({
  path: '.env',
})

if (!fs.existsSync(path.resolve('.env'))) {
  console.log('Not found .env!')
  process.exit(1)
}

class ConfigSchema {
  @IsString()
  DATABASE_URL: string
  @IsString()
  ACCESS_TOKEN_SECRET: string
  @IsString()
  ACCESS_TOKEN_EXPIRES_IN: string
  @IsString()
  REFRESH_TOKEN_SECRET: string
  @IsString()
  REFRESH_TOKEN_EXPIRES_IN: string
}

const configServer = plainToInstance(ConfigSchema, process.env, {
  enableImplicitConversion: true,
})
const errorsArray = validateSync(configServer)
if (errorsArray.length > 0) {
  console.log('Invalid value!')
  const errors = errorsArray.map((eItem) => ({
    property: eItem.property,
    constraints: eItem.constraints,
    value: eItem.value,
  }))
  throw errors
}

export const envConfig = configServer
