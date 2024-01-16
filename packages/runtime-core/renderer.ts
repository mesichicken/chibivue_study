import { ReactiveEffect } from "../reactivity";
import { Component } from "./component";
import { Text, VNode, normalizeVNode } from "./vnode";

// ルートレンダリング関数の型定義。VNodeを受け取り、指定されたコンテナに描画
export type RootRenderFunction<HostElement = RendererElement> = (
  vnode: Component,
  container: HostElement
) => void;

// レンダラーのオプションインターフェース。DOM操作のための基本的なメソッドを定義
export interface RendererOptions<
  HostNode = RendererNode,
  HostElement = RendererElement,
> {
  patchProp(el: HostElement, key: string, value: any): void;

  createElement(type: string): HostElement;

  createText(text: string): HostNode;

  setText(node: HostNode, text: string): void;

  setElementText(node: HostNode, text: string): void;

  insert(child: HostNode, parent: HostNode, anchor?: HostNode | null): void;
}

// レンダラーノードの基本的なインターフェース
export interface RendererNode {
  [key: string]: any;
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
  } = options;

  // VNodeをパッチ（更新）する関数
  const patch = (n1: VNode | null, n2: VNode, container: RendererElement) => {
    const { type } = n2;
    if (type === Text) {
      processText(n1, n2, container);
    } else {
      processElement(n1, n2, container);
    }
  };

  // 要素の処理を行う関数
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement
  ) => {
    if (n1 === null) {
      mountElement(n2, container);
    } else {
      patchElement(n1, n2);
    }
  };

  // 要素をマウント（新規追加）する関数
  const mountElement = (vnode: VNode, container: RendererElement) => {
    const { type, props } = vnode;
    // 要素を作成し、プロパティを設定
    const el: RendererElement = vnode.el = hostCreateElement(type as string);

    // 子要素をマウント
    mountChildren(vnode.children as VNode[], el);

    // 各プロパティに対してパッチを適用
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, props[key]);
      }
    }

    hostInsert(el, container);
  };

  // 子要素をマウントする関数
  const mountChildren = (children: VNode[], container: RendererElement) => {
    for (let i = 0; i < children.length; i++) {
      const child = (children[i] = normalizeVNode(children[i]));
      patch(null, child, container);
    }
  };

  // 要素をパッチ（更新）する関数
  const patchElement = (n1: VNode, n2: VNode) => {
    // 既存の要素を参照
    const el = (n2.el = n1.el!);

    const props = n2.props;

    // 子要素をパッチ
    patchChildren(n1, n2, el);

    // 新しいプロパティで更新
    for (const key in props) {
      if (props[key] !== n1.props?.[key] ?? {}) {
        hostPatchProp(el, key, props[key]);
      }
    }
  };

  // 子要素をパッチ（更新）する関数
  const patchChildren = (n1: VNode, n2: VNode, container: RendererElement) => {
    const c1 = n1.children as VNode[];
    const c2 = n2.children as VNode[];

    for (let i = 0; i < c2.length; i++) {
      const child = (c2[i] = normalizeVNode(c2[i]));
      patch(c1[i], child, container);
    }
  };

  // テキストノードを処理する関数
  const processText = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement
  ) => {
    // 新しいテキストノードの場合は作成し、既存の場合は更新
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children as string)), container);
    } else {
      const el = (n2.el = n1.el!);
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children as string);
      }
    }
  };

  // レンダリング関数
  const render: RootRenderFunction = (rootComponent, container) => {
    const componentRender = rootComponent.setup!();

    let n1: VNode | null = null;

    // コンポーネントの更新関数
    const updateComponent = () => {
      const n2 = componentRender();
      patch(n1, n2, container);
      n1 = n2;
    };

    const effect = new ReactiveEffect(updateComponent);
    effect.run();
  };

  return { render };
}
