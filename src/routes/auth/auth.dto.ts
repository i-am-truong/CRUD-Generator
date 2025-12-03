import { Exclude, Expose, Type } from 'class-transformer'
import { IsString, Length } from 'class-validator'
import { Match } from 'src/shared/decorators/custom-validator.decorator'
import { SuccessResponseDTO } from 'src/shared/shared.dto'

export class LoginBodyDTO {
  @IsString()
  email: string
  @IsString()
  @Length(6, 20, { message: 'Password must be between 6 and 20 characters' })
  password: string
}

export class LoginResponseDTO {
  accessToken: string
  refreshToken: string

  constructor(partial: Partial<LoginResponseDTO>) {
    Object.assign(this, partial)
  }
}

export class RegisterBodyDTO extends LoginBodyDTO {
  @IsString({ message: 'Name must be a string' })
  name: string
  @IsString()
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string
}

class RegisterData {
  id: number
  email: string
  name: string
  @Exclude() password: string
  createdAt: Date
  updatedAt: Date

  constructor(partial: Partial<RegisterResponseDTO>) {
    Object.assign(this, partial)
  }
}

export class RegisterResponseDTO extends SuccessResponseDTO {
  @Type(() => RegisterData)
  declare data: RegisterData

  constructor(partial: Partial<RegisterResponseDTO>) {
    super(partial)
    Object.assign(this, partial)
  }
}

export class RefreshTokenBodyDTO {
  @IsString()
  refreshToken: string
}

export class RefreshTokenResponseDTO extends LoginResponseDTO {}
