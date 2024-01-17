interface Invoker extends EventListener {
  value: EventValue
}

type EventValue = Function

export function addEventListener(
  el: Element,
  event: string,
  handler: EventListener
) {
  el.addEventListener(event, handler)
}

export function removeEventListener(
  el: Element,
  event: string,
  handler: EventListener
) {
  el.removeEventListener(event, handler)
}

/**
 * まず、対象の要素に既存のイベントリスナーがあるかどうかを確認します。
 * イベントハンドラーが提供され、既に存在する場合は、単純に新しい値で更新されます（パッチ）。
 * 新しいイベントハンドラーが提供され、まだ存在しない場合は、createInvokerを使用して新しいInvokerを作成し、それを_veiオブジェクトに追加した後、addEventListenerを使用して実際にイベントリスナーを追加します。
 * イベントハンドラーがnullで、既存のInvokerがある場合は、removeEventListenerを使用してリスナーを削除し、_veiから該当のエントリを削除します。
 */
export function patchEvent(
  el: Element & { _vei?: Record<string, Invoker | undefined> },
  rawName: string,
  value: EventValue | null
) {
  // vei = vue event invokers
  const invokers = el._vei || (el._vei = {})
  const existingInvoker = invokers[rawName]

  if (value && existingInvoker) {
    // patch
    existingInvoker.value = value
  } else {
    const name = parseName(rawName)
    if (value) {
      // add
      const invoker = (invokers[rawName] = createInvoker(value))
      addEventListener(el, name, invoker)
    } else if (existingInvoker) {
      // remove
      removeEventListener(el, name, existingInvoker)
      invokers[rawName] = undefined
    }
  }

  function parseName(rowName: string): string {
    return rowName.slice(2).toLocaleLowerCase() // remove 'on' prefix
  }

  function createInvoker(initialValue: EventValue) {
    const invoker: Invoker = (e: Event) => {
      invoker.value(e)
    }
    invoker.value = initialValue
    return invoker
  }
}
