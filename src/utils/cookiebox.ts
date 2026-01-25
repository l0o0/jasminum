export class MyCookieSandbox {
  public searchCookieBox: Zotero.CookieSandbox | null = null;
  //   public attachmentCookieBox: Zotero.CookieSandbox | null = null;
  //   public refCookieBox: Zotero.CookieSandbox | null = null;
  userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
  baseUrl = "https://www.cnki.net";

  private _CNKIHomeCookieBox: Zotero.CookieSandbox | null = null;
  private _initPromise: Promise<void> | null = null;
  private _captchaPromise: Promise<Zotero.CookieSandbox> | null = null;

  constructor() {}

  public async getCNKIHomeCookieBox(): Promise<Zotero.CookieSandbox> {
    // 如果已经有了，直接返回
    if (this._CNKIHomeCookieBox) {
      return this._CNKIHomeCookieBox;
    }

    if (!this._initPromise) {
      ztoolkit.log("homeCookieBox 为空，开始初始化...");
      // 假设 setCNKIHomeCookieBox 是一个 async 方法
      this._initPromise = this.setCNKIHomeCookieBox();
    }
    await this._initPromise;
    return this._CNKIHomeCookieBox!;
  }

  async setCNKIHomeCookieBox() {
    // 导入 HiddenBrowser
    const { HiddenBrowser } = ChromeUtils.importESModule(
      "chrome://zotero/content/HiddenBrowser.mjs",
    );

    // 创建 CookieSandbox
    const cookieSandbox = new Zotero.CookieSandbox();

    // 创建 HiddenBrowser 并配置 cookieSandbox
    const browser = new HiddenBrowser({
      cookieSandbox: cookieSandbox,
      allowJavaScript: true, // 允许 JavaScript（默认为 true）
    });

    try {
      ztoolkit.log("Loading URL in hidden browser: " + this.baseUrl);
      const loadSuccess = await browser.load(this.baseUrl);
      if (loadSuccess) {
        ztoolkit.log("Page loaded successfully");
        await browser.waitForDocument({ allowInteractiveAfter: 1000 });
        const { cookie } = await browser.getPageData(["cookie"]);
        ztoolkit.log("Cookies from getPageData: " + cookie);

        this._CNKIHomeCookieBox = new Zotero.CookieSandbox(
          null,
          this.baseUrl,
          cookie,
          this.userAgent,
        );
        ztoolkit.log("CNKI Home CookieSandbox initialized.");
        //   let uri = Services.io.newURI(url);
        //   let cookies = cookieSandbox.getCookiesForURI(uri);
        //   if (cookies) {
        //       ztoolkit.log("Cookies from cookieSandbox:");
        //       for (let name in cookies) {
        //           ztoolkit.log(`  ${name} = ${cookies[name]}`);
        //       }
        //       // @ts-ignore - Not typed.
        //       let cookieString = Zotero.CookieSandbox.generateCookieString(cookies);
        //       ztoolkit.log("Cookie string: " + cookieString);
        //   }
      } else {
        ztoolkit.log("Failed to load page");
      }
    } catch (e) {
      ztoolkit.log("Error loading page: " + e);
    } finally {
      // 清理：销毁 browser
      browser.destroy();
      ztoolkit.log("Hidden browser destroyed.");
    }
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

    // @ts-ignore - Not typed.
    const cookieSandbox = new Zotero.CookieSandbox();

    // Note: Zotero.openInViewer actually returns a Window object, but zotero-types incorrectly defines it as returning void
    ztoolkit.log("Opening URL in viewer: " + url);
    const win = Zotero.openInViewer(url, {
      cookieSandbox: cookieSandbox,
    }) as any as Window;

    // 创建 Promise 来等待窗口关闭
    this._captchaPromise = new Promise((resolve, reject) => {
      let promiseSettled = false; // 标记 Promise 是否已经 settled
      let cookieRetrieved = false;

      // 监听窗口关闭事件
      win.addEventListener("close", function () {
        ztoolkit.log("Window closed");
        if (!promiseSettled) {
          promiseSettled = true;
          if (cookieRetrieved) {
            ztoolkit.log("Cookie sandbox returned successfully");
            resolve(cookieSandbox);
          } else {
            ztoolkit.log("Window closed without retrieving cookies");
            reject(new Error("用户关闭窗口，未完成验证"));
          }
        }
      });

      // 等待窗口加载完成
      win.addEventListener("load", function () {
        ztoolkit.log("Window loaded, adding button");

        // 创建按钮容器
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
            properties: { textContent: "请完成验证码，验证成功后，点击此按钮" },
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
            color: "white",
            border: "none",
            borderRadius: "5px",
            width: "50%",
            fontWeight: "bold",
          },
        });

        button.addEventListener("mouseover", function () {
          if (!button.disabled) {
            button.style.backgroundColor = "#45a049";
          }
        });

        button.addEventListener("mouseout", function () {
          if (!button.disabled) {
            button.style.backgroundColor = "#4CAF50";
          }
        });

        // 绑定点击事件
        button.addEventListener("click", function () {
          try {
            const uri = Services.io.newURI(url);
            const cookies = cookieSandbox.getCookiesForURI(uri);
            ztoolkit.log("Cookies retrieved from sandbox.", cookies);

            if (cookies) {
              for (const name in cookies) {
                ztoolkit.log(`  ${name} = ${cookies[name]}`);
              }

              // 标记 cookie 已获取
              cookieRetrieved = true;

              // 根据 cookieType 设置对应的 cookieSandbox
              switch (cookieType) {
                case "CNKI:Home":
                  addon.data.myCookieSandbox._CNKIHomeCookieBox = cookieSandbox;
                  break;
                // 其他类型...
              }
              // 先 resolve Promise，再关闭窗口
              if (!promiseSettled) {
                promiseSettled = true;
                resolve(cookieSandbox);
                ztoolkit.log("Promise resolved with cookieSandbox");
              }
              win.close();
              ztoolkit.log("Cookies passed to addon CookieSandbox.");
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

        // 双击切换左右位置
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

    // 在 Promise 完成后清空，无论成功还是失败
    this._captchaPromise.finally(() => {
      this._captchaPromise = null;
      ztoolkit.log("Captcha promise cleared, ready for next captcha request");
    });

    return this._captchaPromise;
  }
}
