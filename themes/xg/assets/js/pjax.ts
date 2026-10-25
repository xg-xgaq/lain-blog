function loadScripts(scripts: HTMLScriptElement[], index: number) {
  if (index < scripts.length) {
    const script = scripts[index];
    const src = script.getAttribute("src");

    const loadScript = (scriptContent?: string) => {
      return new Promise<void>((resolve, reject) => {
        const scriptElement = document.createElement("script");
        if (script.type) {
          scriptElement.type = script.type;
        }
        if (script.src) {
          scriptElement.src = script.src;
          if (script.integrity) {
            scriptElement.integrity = script.integrity;
          }
          if (script.crossOrigin) {
            scriptElement.crossOrigin = script.crossOrigin;
          }
          scriptElement.onload = resolve as any;
          scriptElement.onerror = reject;
        }
        if (scriptContent) {
          scriptElement.text = scriptContent;
        }
        document.head.appendChild(scriptElement);
        if (!script.src) {
          resolve();
        }
      });
    };

    (src ? loadScript() : loadScript(script.text))
      .then(() => loadScripts(scripts, index + 1))
      .catch((error) => {
        console.error(
          `Failed to load script: ${src || "inline script"}`,
          error,
        );
        loadScripts(scripts, index + 1);
      });
  }
}
if (window.Pjax) {
  Pjax.prototype.getElements = function () {
    const i18nLanguages = window.siteConfig.i18n_languages;
    const baseUrl = window.siteConfig.base;
    let basePathname = new URL(baseUrl).pathname;
    if (!basePathname.endsWith("/")) {
      basePathname += "/";
    }
    const currentUrl = window.location.href;
    const currentPathname = new URL(currentUrl).pathname.replace(
      basePathname,
      "",
    );
    const aLinks = document.querySelectorAll("a[href]");
    const pjaxLinks = [];
    for (let i = 0; i < aLinks.length; i++) {
      const aLink = aLinks[i];
      const aLinkHref = aLink.getAttribute("href");
      const isExternal =
        aLink.getAttribute("target") === "_blank" ||
        aLink.getAttribute("rel")?.includes("noopener");
      if (
        isExternal ||
        aLinkHref.startsWith("mailto:") ||
        aLinkHref.startsWith("tel:") ||
        aLinkHref.startsWith("javascript:") ||
        aLinkHref.startsWith("data:") ||
        aLinkHref.startsWith("vbscript:")
      ) {
        continue;
      }
      if (!i18nLanguages) {
        // 多语言功能未打开
        pjaxLinks.push(aLink);
        continue;
      }
      const absoluteUrl = new URL(aLinkHref, currentUrl).href;
      const absolutePathname = new URL(absoluteUrl).pathname.replace(
        basePathname,
        "",
      );
      if (!absolutePathname || !currentPathname) {
        pjaxLinks.push(aLink);
        continue;
      }
      const currentLangIndex = i18nLanguages.findIndex((lang) =>
        currentPathname.startsWith(lang.Lang),
      );
      if (currentLangIndex > -1) {
        // 当前属于多语言站点
        const absoluteLangIndex = i18nLanguages.findIndex((lang) =>
          absolutePathname.startsWith(lang.Lang),
        );
        if (absoluteLangIndex === currentLangIndex) {
          // 同一语言站点，可以使用 pjax
          pjaxLinks.push(aLink);
        }
      } else {
        // 当前属于默认语言站点
        const absoluteLangIndex = i18nLanguages.findIndex((lang) =>
          absolutePathname.startsWith(lang.Lang),
        );
        if (absoluteLangIndex === -1) {
          // 同一语言站点，可以使用 pjax
          pjaxLinks.push(aLink);
        }
      }
    }
    return pjaxLinks;
  };
}
const pjaxInstance = window.Pjax
  ? new window.Pjax({
    selectors: [
      "#header>img",
      "#header>picture",
      "head title",
      "#header-title",
      "#subtitle-wrap",
      "#main",
      "#content",
      ".sidebar-widget",
      ".sidebar-wrapper",
      ".sidebar-wrapper-container",
      "#mobile-nav",
      "#lazy-script",
      "#i18n-nav",
    ],
    switches: {
      ".sidebar-wrapper-container": function (oldEl, newEl) {
        oldEl.className = newEl.className;
        this.onSwitch();
      },
      "#content": function (oldEl, newEl) {
        // for sidebar change
        oldEl.className = newEl.className;
        this.onSwitch();
      },
      "#header-title": Pjax.switches.outerHTML,
      "#subtitle-wrap": Pjax.switches.outerHTML,
      "#main": function (oldEl, newEl) {
        const scripts = [...newEl.querySelectorAll("script")];
        loadScripts(scripts, 0);
        oldEl.outerHTML = newEl.outerHTML;
        this.onSwitch();
      },
      "#mobile-nav": Pjax.switches.outerHTML,
      "#lazy-script": function (oldEl, newEl) {
        const scripts = [...newEl.querySelectorAll("script")];
        loadScripts(scripts, 0);
        oldEl.innerHTML = newEl.innerHTML;
        this.onSwitch();
      },
    },
    cacheBust: false,
  })
  : null;

// Swapped-in links keep a stale data-pjax-state attribute but lose their
// listeners, so the library never rebinds them and the next click falls back
// to a full page load (which kills the music player). Catch those clicks at
// document level; links the library did bind call preventDefault first.
document.addEventListener("click", (event) => {
  if (!pjaxInstance || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const anchor = (event.target as Element)?.closest?.(
    "a[href]",
  ) as HTMLAnchorElement | null;
  if (!anchor) return;
  if (anchor.target && anchor.target !== "_self") return;
  if (anchor.hasAttribute("download")) return;
  if (anchor.getAttribute("rel")?.includes("noopener")) return;
  const href = anchor.getAttribute("href");
  if (!href || /^(mailto:|tel:|javascript:|data:|vbscript:)/i.test(href)) {
    return;
  }
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (
    url.pathname === window.location.pathname &&
    (url.hash || anchor.href === window.location.href.split("#")[0] + "#")
  ) {
    return;
  }
  event.preventDefault();
  pjaxInstance.loadUrl(anchor.href);
});

window.addEventListener("pjax:success", () => {
  _$$("script[data-pjax]").forEach((element) => {
    const {
      textContent,
      parentNode,
      id,
      className,
      type,
      src,
      dataset,
      integrity,
      crossOrigin,
    } = element as HTMLScriptElement;
    const code = textContent || "";
    const script = document.createElement("script");

    id && (script.id = id);
    className && (script.className = className);
    type && (script.type = type);
    dataset.pjax !== undefined && (script.dataset.pjax = "");
    integrity && (script.integrity = integrity);
    crossOrigin && (script.crossOrigin = crossOrigin);

    if (src) {
      script.src = src;
      script.async = false; // Force synchronous loading of peripheral JS
    } else if (code) {
      script.textContent = code;
    }
    parentNode?.replaceChild(script, element);
  });
});
window.addEventListener("pjax:complete", () => {
  _$("#header-nav")?.classList.remove("header-nav-hidden");
  const mode = window.localStorage.getItem("dark_mode");
  document.body.dispatchEvent(
    new CustomEvent("reimu:theme-set", {
      detail: {
        isDark:
          mode === "true" ||
          (mode === "auto" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches),
        mode: mode || "auto",
      },
    })
  );
  // destroy waline
  if (window.walineInstance) {
    window.walineInstance.destroy();
    window.walineInstance = null;
  }
});
window.addEventListener("pjax:send", () => {
  // destroy panZoom
  if (window.__panZoomList) {
    window.__panZoomList.forEach((panZoom) => panZoom.destroy());
    window.__panZoomList = [];
  }
});
if (window.startLoading) window.addEventListener("pjax:send", startLoading!);
if (window.endLoading) window.addEventListener("pjax:complete", endLoading!);
if (window.aosInit) window.addEventListener("pjax:success", aosInit!);
