import { ReactiveEffect } from "../reactivity"
import { Component, ComponentInternalInstance, InternalRenderFunction, createComponentInstance } from "./component"
import { initProps, updateProps } from "./componentProps"
import { Text, VNode, createVNode, normalizeVNode } from "./vnode"

// ルートレンダリング関数の型定義。VNodeを受け取り、指定されたコンテナに描画
export type RootRenderFunction<HostElement = RendererElement> = (
  vnode: Component,
  container: HostElement
) => void

// レンダラーのオプションインターフェース。DOM操作のための基本的なメソッドを定義
export interface RendererOptions<
  HostNode = RendererNode,
  HostElement = RendererElement,
> {
  patchProp(el: HostElement, key: string, value: any): void

  createElement(type: string): HostElement

  createText(text: string): HostNode

  setText(node: HostNode, text: string): void

  setElementText(node: HostNode, text: string): void

  insert(child: HostNode, parent: HostNode, anchor?: HostNode | null): void

  parentNode(node: HostNode): HostNode | null
}

// レンダラーノードの基本的なインターフェース
export interface RendererNode {
  [key: string]: any
}

// レンダラーエレメントの基本的なインターフェース
export interface RendererElement extends RendererNode {}

// レンダラーのインスタンスを生成する関数
export function createRenderer(options: RendererOptions) {
  // オプションからDOM操作のためのメソッドを取り出す
  const {
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    setText: hostSetText,
    insert: hostInsert,
    parentNode: hostParentNode,
  } = options

  // VNodeをパッチ（更新）する関数
  const patch = (n1: VNode | null, n2: VNode, container: RendererElement) => {
    const { type } = n2
    if (type === Text) {
      processText(n1, n2, container)
    } else if (typeof type === "string") {
      processElement(n1, n2, container)
    } else if (typeof type === "object") {
      processComponent(n1, n2, container)
    }
  }

  // 要素の処理を行う関数
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement
  ) => {
    if (n1 === null) {
      mountElement(n2, container)
    } else {
      patchElement(n1, n2)
    }
  }

  // 要素をマウント（新規追加）する関数
  const mountElement = (vnode: VNode, container: RendererElement) => {
    const { type, props } = vnode
    // 要素を作成し、プロパティを設定
    const el: RendererElement = (vnode.el = hostCreateElement(type as string))

    // 子要素をマウント
    mountChildren(vnode.children as VNode[], el)

    // 各プロパティに対してパッチを適用
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, props[key])
      }
    }

    hostInsert(el, container)
  }

  // 子要素をマウントする関数
  const mountChildren = (children: VNode[], container: RendererElement) => {
    for (let i = 0; i < children.length; i++) {
      const child = (children[i] = normalizeVNode(children[i]))
      patch(null, child, container)
    }
  }

  // 要素をパッチ（更新）する関数
  const patchElement = (n1: VNode, n2: VNode) => {
    // 既存の要素を参照
    const el = (n2.el = n1.el!)

    const props = n2.props

    // 子要素をパッチ
    patchChildren(n1, n2, el)

    // 新しいプロパティで更新
    for (const key in props) {
      if (props[key] !== n1.props?.[key] ?? {}) {
        hostPatchProp(el, key, props[key])
      }
    }
  }

  // 子要素をパッチ（更新）する関数
  const patchChildren = (n1: VNode, n2: VNode, container: RendererElement) => {
    const c1 = n1.children as VNode[]
    const c2 = n2.children as VNode[]

    for (let i = 0; i < c2.length; i++) {
      const child = (c2[i] = normalizeVNode(c2[i]))
      patch(c1[i], child, container)
    }
  }

  // テキストノードを処理する関数
  const processText = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement
  ) => {
    // 新しいテキストノードの場合は作成し、既存の場合は更新
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children as string)), container)
    } else {
      const el = (n2.el = n1.el!)
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children as string)
      }
    }
  }

  // コンポーネントを処理する関数
  const processComponent = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement
  ) => {
    if (n1 === null) {
      mountComponent(n2, container)
    } else {
      updateComponent(n1, n2)
    }
  }

  // コンポーネントをマウントする関数
  const mountComponent = (initialVNode: VNode, container: RendererElement) => {
    const instance: ComponentInternalInstance = (initialVNode.component =
      createComponentInstance(initialVNode))

    const { props } = instance.vnode
    initProps(instance, props)

    const component = initialVNode.type as Component
    if (component.setup) {
      instance.render = component.setup(instance.props, {
        emit: instance.emit,
      }) as InternalRenderFunction
    }

    setupRenderEffect(instance, initialVNode, container)
  }

  // コンポーネントのレンダリングを行う関数
  const setupRenderEffect = (
    instance: ComponentInternalInstance,
    initialVNode: VNode,
    container: RendererElement
  ) => {
    const componentUpdateFn = () => {
      const { render } = instance

      if (!instance.isMounted) {
        // mount process
        const subTree = (instance.subTree = normalizeVNode(render()))
        patch(null, subTree, container)
        initialVNode.el = subTree.el
        instance.isMounted = true
      } else {
        // patch process
        let { next, vnode } = instance

        if (next) {
          next.el = vnode.el
          next.component = instance
          instance.vnode = next
          instance.next = null
          updateProps(instance, next.props)
        } else {
          next = vnode
        }

        const prevTree = instance.subTree
        const nextTree = normalizeVNode(render())
        instance.subTree = nextTree

        patch(prevTree, nextTree, hostParentNode(prevTree.el!)!)
        next.el = nextTree.el
      }
    }

    const effect = (instance.effect = new ReactiveEffect(componentUpdateFn))
    const update = (instance.update = () => effect.run()) // instance.updateに登録
    update()
  }

  // コンポーネントをパッチ（更新）する関数
  const updateComponent = (n1: VNode, n2: VNode) => {
    const instance = (n2.component = n1.component)!
    instance.next = n2
    instance.update()
  }

  // ルートレンダリング関数を返す
  const render: RootRenderFunction = (rootComponent, container) => {
    const vnode = createVNode(rootComponent, {}, [])
    patch(null, vnode, container)
  }

  return { render }
}
