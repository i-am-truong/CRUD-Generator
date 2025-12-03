import { SetMetadata } from '@nestjs/common'
import { AuthTypeType, ConditionalGuardType, ConditionGuard } from '../constants/auth.constant'

export const AUTH_TYPE_KEY = 'authType'

export type AuthTypeDecoratorPayload = { authTypes: AuthTypeType[]; options: { condition: ConditionalGuardType } }

export const Auth = (authTypes: AuthTypeType[], options?: { condition: ConditionalGuardType }) => {
  return SetMetadata(AUTH_TYPE_KEY, { authTypes, options: options ?? { condition: ConditionGuard.And } })
}
