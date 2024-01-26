import { camelize, toHandlerKey } from '../shared'
import { ComponentInternalInstance } from './component'

export function emit(
  instance: ComponentInternalInstance,
  event: string,
  ...rawArgs: any[]
) {
  const props = instance.vnode.props || {}
  const args = rawArgs

  const handler =
    props[toHandlerKey(event)] || props[toHandlerKey(camelize(event))]

  if (handler) handler(...args)
}