import { RendererOptions } from "../runtime-core";
import { patchAttr } from "./modules/attrs";
import { patchEvent } from "./modules/events";

type DOMRendererOptions = RendererOptions<Node, Element>;

const onRE = /^on[^a-z]/;
export const isOn = (key: string) => onRE.test(key);

/**
 * 関数はまず、keyがイベントリスナーを示すものかどうかをisOnを使って判断します。
 * もしkeyがイベントリスナーなら、patchEventを使ってそのイベントをパッチします。
 * イベントリスナーでなければ、patchAttrを使って属性をパッチします。
 */
export const patchProp: DOMRendererOptions["patchProp"] = (el, key, value) => {
  if (isOn(key)) {
    patchEvent(el, key, value);
  } else {
    patchAttr(el, key, value);
  }
};
