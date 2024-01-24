import { ReactiveEffect } from "../reactivity"
import { ComponentOptions } from "./componentOptions"
import { Props } from "./componentProps"
import { VNode, VNodeChild } from "./vnode"

export type Component = ComponentOptions

export type Data = Record<string, unknown>

export interface ComponentInternalInstance {
  type: Component
  vnode: VNode
  subTree: VNode
  next: VNode | null
  effect: ReactiveEffect
  render: InternalRenderFunction
  update: () => void
  isMounted: boolean
  propsOptions: Props // `props: { message: { type: String } }` のようなオブジェクトを保持
  props: Data // 実際に親から渡されたデータを保持
}

export type InternalRenderFunction = {
  (): VNodeChild
}

export function createComponentInstance(
  vnode: VNode
): ComponentInternalInstance {
  const type = vnode.type as Component

  const instance: ComponentInternalInstance = {
    type,
    vnode,
    next: null,
    effect: null!,
    subTree: null!,
    update: null!,
    render: null!,
    isMounted: false,
    propsOptions: type.props || {},
    props: {},
  }

  return instance
}
