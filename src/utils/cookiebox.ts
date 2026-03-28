export class MyCookieSandbox {
  public searchCookieBox: Zotero.CookieSandbox | null = null;
  //   public attachmentCookieBox: Zotero.CookieSandbox | null = null;
  //   public refCookieBox: Zotero.CookieSandbox | null = null;
  userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
  baseUrl = "https://www.cnki.net";

  private _CNKIHomeCookieBox: Zotero.CookieSandbox | null = null;
  private _cnkiHomeCookieLastUpdateTime: number = 0;
  private _initPromise: Promise<void> | null = null;
  private _captchaPromise: Promise<Zotero.CookieSandbox> | null = null;
  private static readonly COOKIE_EXPIRE_MS = 5 * 60 * 1000; // 10 minutes

  constructor() {
    this._CNKIHomeCookieBox = null;
  }

  public async getCookieBoxFromUrl(
    url: string,
    hintText: string = "请完成验证码，验证成功后，点击此按钮",
  ): Promise<Zotero.CookieSandbox> {
    // @ts-ignore - Not typed.
    const cookieSandbox = new Zotero.CookieSandbox();

    ztoolkit.log("Opening URL in viewer: " + url);
    const win = Zotero.openInViewer(url, {
      cookieSandbox: cookieSandbox,
    }) as any as Window;

    return new Promise((resolve, reject) => {
      let promiseSettled = false;
      let cookieRetrieved = false;

      win.addEventListener("close", function () {
        ztoolkit.log("Window closed");
        if (!promiseSettled) {
          promiseSettled = true;
          if (cookieRetrieved) {
            ztoolkit.log("Cookie sandbox returned successfully");
            resolve(cookieSandbox);
          } else {
            ztoolkit.log("Window closed without retrieving cookies");
            reject(new Error(`用户关闭窗口，未完成验证: ${url}`));
          }
        }
      });

      win.addEventListener("load", function () {
        ztoolkit.log("Window loaded, adding button");

        const buttonContainer = ztoolkit.UI.createElement(win.document, "box", {
          namespace: "html",
          attributes: { id: "captcha-button-container" },
          styles: {
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: "10000",
            padding: "15px",
            backgroundColor: "white",
            border: "3px solid red",
            borderRadius: "8px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
            cursor: "pointer",
            userSelect: "none",
            transition: "left 0.3s ease, right 0.3s ease",
          },
        });

        let isOnRight = true;

        const titleLabel = ztoolkit.UI.createElement(win.document, "label", {
          namespace: "html",
          attributes: { value: "茉莉花提示：" },
          styles: {
            fontWeight: "bold",
            color: "black",
            fontSize: "14px",
            marginBottom: "5px",
            display: "block",
          },
        });

        const hintLabel = ztoolkit.UI.createElement(
          win.document,
          "description",
          {
            namespace: "html",
            properties: { textContent: hintText },
            styles: {
              color: "black",
              fontSize: "12px",
              marginBottom: "10px",
              lineHeight: "1.5",
              maxWidth: "250px",
              whiteSpace: "normal",
              wordWrap: "break-word",
            },
          },
        );

        const positionHint = ztoolkit.UI.createElement(
          win.document,
          "description",
          {
            namespace: "html",
            properties: { textContent: "(双击此框可切换左右位置)" },
            styles: {
              color: "#666",
              fontSize: "10px",
              marginBottom: "8px",
              fontStyle: "italic",
            },
          },
        );

        const button = ztoolkit.UI.createElement(win.document, "button", {
          namespace: "html",
          properties: { textContent: "确认完成验证" },
          styles: {
            fontSize: "12px",
            padding: "4px",
            cursor: "pointer",
            backgroundColor: "#4CAF50",
            background: "#4CAF50",
            color: "black",
            border: "none",
            borderRadius: "5px",
            width: "50%",
            fontWeight: "bold",
          },
        });

        button.addEventListener("mouseover", function () {
          if (!button.disabled) {
            button.style.backgroundColor = "#45a049";
            button.style.background = "#45a049";
          }
        });

        button.addEventListener("mouseout", function () {
          if (!button.disabled) {
            button.style.backgroundColor = "#4CAF50";
            button.style.background = "#4CAF50";
          }
        });

        button.addEventListener("click", function () {
          try {
            const uri = Services.io.newURI(url);
            const cookies = cookieSandbox.getCookiesForURI(uri);
            ztoolkit.log("Cookies retrieved from sandbox.", cookies);

            if (cookies) {
              for (const name in cookies) {
                ztoolkit.log(`  ${name} = ${cookies[name]}`);
              }

              cookieRetrieved = true;

              if (!promiseSettled) {
                promiseSettled = true;
                resolve(cookieSandbox);
                ztoolkit.log("Promise resolved with cookieSandbox");
              }
              win.close();
              ztoolkit.log("Cookies retrieved successfully.");
            } else {
              ztoolkit.log("未找到 cookies");
              button.setAttribute("label", "✗ 未找到 Cookie");
              button.style.backgroundColor = "#f44336";
              button.style.color = "white";
              hintLabel.textContent = "未找到 Cookie，请确保已完成验证";
              hintLabel.style.color = "#f44336";
            }
          } catch (e: any) {
            ztoolkit.log("获取 cookie 时出错: " + e);
            button.setAttribute("label", "✗ 出错了");
            button.style.backgroundColor = "#f44336";
            button.style.color = "white";
            hintLabel.textContent = "出错了: " + e.message;
            hintLabel.style.color = "#f44336";
          }
        });

        buttonContainer.appendChild(titleLabel);
        buttonContainer.appendChild(hintLabel);
        buttonContainer.appendChild(positionHint);
        buttonContainer.appendChild(button);

        buttonContainer.addEventListener("dblclick", function (e) {
          if (
            e.target === button ||
            (e.target as HTMLElement).closest("button")
          ) {
            return;
          }

          if (isOnRight) {
            buttonContainer.style.right = "auto";
            buttonContainer.style.left = "10px";
            isOnRight = false;
            ztoolkit.log("Button moved to left");
          } else {
            buttonContainer.style.left = "auto";
            buttonContainer.style.right = "10px";
            isOnRight = true;
            ztoolkit.log("Button moved to right");
          }
        });

        const browserBox = win.document.getElementById("browser");
        if (browserBox) {
          browserBox.appendChild(buttonContainer);
        } else {
          win.document.documentElement.appendChild(buttonContainer);
        }

        ztoolkit.log("Button with position toggle added successfully");
      });
    });
  }

  public async getCNKIHomeCookieBox(): Promise<Zotero.CookieSandbox> {
    const now = Date.now();
    const isExpired =
      now - this._cnkiHomeCookieLastUpdateTime >
      MyCookieSandbox.COOKIE_EXPIRE_MS;

    // If cookie exists and not expired, return directly
    // Valid cookie has more than 1 cookie item.
    if (
      this._CNKIHomeCookieBox != null &&
      !isExpired &&
      Object.keys(this._CNKIHomeCookieBox._cookies).length > 1
    ) {
      return this._CNKIHomeCookieBox;
    }

    // Cookie expired or missing, reset for re-initialization
    if (
      isExpired ||
      this._CNKIHomeCookieBox === null ||
      Object.keys(this._CNKIHomeCookieBox._cookies).length <= 1
    ) {
      ztoolkit.log("CNKI Home cookie expired or invalid, re-initializing...");
      this._CNKIHomeCookieBox = null;
      this._initPromise = null;
    }

    if (!this._initPromise) {
      ztoolkit.log("homeCookieBox 为空，开始初始化...");
      this._initPromise = this.getCookieBoxFromUrl(
        "https://kns.cnki.net/kns8s/defaultresult/index?crossids=YSTT4HG0%2CLSTPFY1C%2CJUP3MUPD%2CMPMFIG1A%2CWQ0UVIAA%2CBLZOG7CK%2CPWFIRAGL%2CEMRPGLPA%2CNLBO1Z6R%2CNN3FJMUV&korder=SU&kw=%E7%A7%91%E7%A0%94%E8%AE%BA%E6%96%87%E9%98%85%E8%AF%BB",
        "请等待知网网页正常打开后，再点击下方按钮关闭",
      ).then((cookieSandbox) => {
        this._CNKIHomeCookieBox = cookieSandbox;
        this._cnkiHomeCookieLastUpdateTime = Date.now();
      });
    }
    await this._initPromise;
    // 保险起见，再次检查是否成功获取到 cookieSandbox
    // if (
    //   this._CNKIHomeCookieBox == null
    // ) {
    //   ztoolkit.log("homeCookieBox 还是为空，又开始初始化...");
    //   this._CNKIHomeCookieBox = await this.getCookieBoxFromUrl(
    //     "https://kns.cnki.net/kns8s/defaultresult/index?crossids=YSTT4HG0%2CLSTPFY1C%2CJUP3MUPD%2CMPMFIG1A%2CWQ0UVIAA%2CBLZOG7CK%2CPWFIRAGL%2CEMRPGLPA%2CNLBO1Z6R%2CNN3FJMUV&korder=SU&kw=%E7%A7%91%E7%A0%94%E8%AE%BA%E6%96%87%E9%98%85%E8%AF%BB",
    //     "请等待知网网页正常打开后，再点击下方按钮关闭",
    //   );
    //   this._cnkiHomeCookieLastUpdateTime = Date.now();
    // }
    return this._CNKIHomeCookieBox!;
  }

  async passCaptchaToCookieBox(
    url: string,
    cookieType:
      | "CNKI:Search"
      | "CNKI:Attachment"
      | "CNKI:Reference"
      | "CNKI:Home",
  ): Promise<Zotero.CookieSandbox> {
    // 如果已经有验证码窗口在运行，等待它完成
    if (this._captchaPromise) {
      ztoolkit.log(
        "Captcha window is already running, waiting for it to complete...",
      );
      return this._captchaPromise;
    }

    this._captchaPromise = this.getCookieBoxFromUrl(url).then(
      (cookieSandbox) => {
        // 根据 cookieType 设置对应的 cookieSandbox
        switch (cookieType) {
          case "CNKI:Home":
            addon.data.myCookieSandbox._CNKIHomeCookieBox = cookieSandbox;
            addon.data.myCookieSandbox._cnkiHomeCookieLastUpdateTime =
              Date.now();
            break;
          // 其他类型...
        }
        ztoolkit.log("Cookies passed to addon CookieSandbox.");
        return cookieSandbox;
      },
    );

    // 在 Promise 完成后清空，无论成功还是失败
    this._captchaPromise.finally(() => {
      this._captchaPromise = null;
      ztoolkit.log("Captcha promise cleared, ready for next captcha request");
    });

    return this._captchaPromise;
  }
}
