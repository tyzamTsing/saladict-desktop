import './style.scss'
import { store, triggerInputValueChangeEvent } from '../utils'
import { remote, ipcRenderer } from 'electron'

const loadIframe = async (src: string) => {
  const iframe = document.createElement('iframe')

  iframe.src = src

  return new Promise<HTMLIFrameElement>((resolve, reject) => {
    iframe.onload = function () {
      resolve(iframe)
    }

    iframe.onerror = function (error) {
      reject(error)
    }
    document.body.appendChild(iframe)
  })
}

let iframe: HTMLIFrameElement

const querySelectorFromIframe = (selector: string, wrap = iframe) => {
  return wrap.contentWindow?.document.querySelector(selector)
}

const handleQuickSearchPage = () => {
  const dictHeadELe = querySelectorFromIframe(
    '#root > div > div.dictPanel-Head > header',
  )

  // TODO
  if (!dictHeadELe) {
    return
  }

  const searchInputEle = dictHeadELe.querySelector(
    'div.menuBar-SearchBox_Wrap > input',
  ) as HTMLInputElement

  ipcRenderer.on('search-word-message', (event, { text }) => {
    triggerInputValueChangeEvent(searchInputEle, text)
    ;(dictHeadELe.querySelector(
      'button:nth-child(4)',
    ) as HTMLInputElement).click()
  })

  dictHeadELe.addEventListener('click', (event) => {
    let target = event.target as HTMLElement

    if (target.nodeName !== 'BUTTON') {
      target = target.parentElement as HTMLElement
    }

    const index = Array.from(dictHeadELe.children).indexOf(target)

    // 6: notebook
    // 9: close
    if ([6, 9].includes(index)) {
      event.preventDefault()
      event.stopPropagation()

      if (index === 6) {
        // @ts-ignore
        window.browser.runtime.sendMessage({
          type: 'OPEN_URL',
          payload: {
            url:
              'word-editor.html?word=' +
              encodeURIComponent(searchInputEle.value || ''),
            self: true,
          },
        })
      } else {
        remote.getCurrentWindow().hide()
      }
    }
  })
}

const handleWordEditorPage = (text: string) => {
  const word = decodeURIComponent(text || '')

  setTimeout(() => {
    const ele = querySelectorFromIframe(
      '#wordEditorNote_Word',
    ) as HTMLInputElement

    // @ts-ignore
    triggerInputValueChangeEvent(ele, word)
    ;(querySelectorFromIframe(
      '#root > div > div > div > div > footer > button:nth-child(1)',
    ) as HTMLButtonElement).click()
  }, 500)
}

;(() => {
  if (!store.get('VERSION')) {
    // @ts-ignore
    window.browser.runtime.onInstalled._listeners.forEach((listener) => {
      listener({ reason: '' })
    })

    const currentVersion = remote.app.getVersion()

    store.set('VERSION', currentVersion)
  }
})()

const main = async () => {
  const query = new URLSearchParams(window.location.search)

  const redirectUrl = query.get('redirect') || 'quick-search.html'

  const src = `/${redirectUrl}?direct=true`

  iframe = await loadIframe(src)

  if (redirectUrl.startsWith('quick-search')) {
    handleQuickSearchPage()
  } else if (redirectUrl.startsWith('word-editor')) {
    handleWordEditorPage(query.get('word') || '')
  }
}

main()
