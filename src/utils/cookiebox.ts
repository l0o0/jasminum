export class MyCookieSandbox {
  public searchCookieBox: Zotero.CookieSandbox | null = null;
  //   public attachmentCookieBox: Zotero.CookieSandbox | null = null;
  //   public refCookieBox: Zotero.CookieSandbox | null = null;
  userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
  baseUrl = "https://cnki.net/";

  private _CNKIHomeCookieBox: Zotero.CookieSandbox | null = null;
  private _initPromise: Promise<void> | null = null;

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
    const url = "https://www.cnki.net/";

    // 创建 HiddenBrowser 并配置 cookieSandbox
    const browser = new HiddenBrowser({
      cookieSandbox: cookieSandbox,
      allowJavaScript: true, // 允许 JavaScript（默认为 true）
    });

    try {
      ztoolkit.log("Loading URL in hidden browser: " + url);
      const loadSuccess = await browser.load(url);
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
    }
  }

  passCaptchaToCookieBox(
    url: string,
    cookieType:
      | "CNKI:Search"
      | "CNKI:Attachment"
      | "CNKI:Reference"
      | "CNKI:Home",
  ) {
    // @ts-ignore - Not typed.
    const cookieSandbox = new Zotero.CookieSandbox();

    const win = Zotero.openInViewer(url, {
      cookieSandbox: cookieSandbox,
    });

    // 等待窗口加载完成
    win.addEventListener("load", function () {
      Zotero.debug("Window loaded, adding button");

      // 创建按钮容器
      const buttonContainer = ztoolkit.UI.createElement(win.document, "box", {
        namespace: "html",
        attributes: { id: "captcha-button-container" },
        styles: {
          position: "fixed",
          top: "10px",
          right: "10px", // 默认在右侧
          zIndex: "10000",
          padding: "15px",
          backgroundColor: "white",
          border: "3px solid red",
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
          cursor: "pointer",
          userSelect: "none",
          transition: "left 0.3s ease, right 0.3s ease", // 添加过渡动画
        },
      }) as HTMLElement;

      // 记录当前位置状态（true=右侧，false=左侧）
      let isOnRight = true;

      // 添加标题文本
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

      // 添加提示文本
      const hintLabel = ztoolkit.UI.createElement(win.document, "description", {
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
      });

      // 添加位置提示
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

      // 创建按钮
      const button = ztoolkit.UI.createElement(win.document, "button", {
        namespace: "html",
        attributes: { label: "确认完成验证" },
        styles: {
          fontSize: "14px",
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "5px",
          width: "100%",
          fontWeight: "bold",
        },
      });

      // 鼠标悬停效果
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
      button.addEventListener("command", function () {
        Zotero.debug("Button clicked, getting cookies...");

        try {
          const uri = Services.io.newURI(url);
          const cookies = cookieSandbox.getCookiesForURI(uri);
          ztoolkit.log("Cookies retrieved from sandbox.", cookies);
          if (cookies) {
            Zotero.debug("成功获取 cookies:");
            for (const name in cookies) {
              Zotero.debug(`  ${name} = ${cookies[name]}`);
            }

            // 显示成功消息
            button.setAttribute("label", "✓ Cookie 已获取");
            button.style.backgroundColor = "#2196F3";
            button.style.color = "white";
            button.disabled = true;
            hintLabel.textContent = "Cookie 已成功获取！窗口即将关闭...";
            hintLabel.style.color = "#2196F3";
            positionHint.style.display = "none";

            // 在这里添加您的后续处理逻辑
            // 例如：关闭窗口、继续下载等

            // 可选：3秒后关闭窗口
            setTimeout(() => {
              win.close();
            }, 2000);
          } else {
            Zotero.debug("未找到 cookies");
            button.setAttribute("label", "✗ 未找到 Cookie");
            button.style.backgroundColor = "#f44336";
            button.style.color = "white";
            hintLabel.textContent = "未找到 Cookie，请确保已完成验证";
            hintLabel.style.color = "#f44336";
          }
        } catch (e: any) {
          Zotero.debug("获取 cookie 时出错: " + e);
          button.setAttribute("label", "✗ 出错了");
          button.style.backgroundColor = "#f44336";
          button.style.color = "white";
          hintLabel.textContent = "出错了: " + e.message;
          hintLabel.style.color = "#f44336";
        }
      });

      // 将元素添加到容器
      buttonContainer.appendChild(titleLabel);
      buttonContainer.appendChild(hintLabel);
      buttonContainer.appendChild(positionHint);
      buttonContainer.appendChild(button);

      // 双击切换左右位置
      buttonContainer.addEventListener("dblclick", function (e) {
        // 如果双击的是按钮本身，不切换位置
        if (e.target instanceof HTMLElement) {
          if (e.target === button || e.target.closest("button")) {
            return;
          }
        }

        if (isOnRight) {
          // 从右侧移到左侧
          buttonContainer.style.right = "auto";
          buttonContainer.style.left = "10px";
          isOnRight = false;
          Zotero.debug("Button moved to left");
        } else {
          // 从左侧移到右侧
          buttonContainer.style.left = "auto";
          buttonContainer.style.right = "10px";
          isOnRight = true;
          Zotero.debug("Button moved to right");
        }
      });

      // 添加鼠标悬停提示效果
      buttonContainer.addEventListener("mouseover", function () {
        buttonContainer.style.boxShadow = "0 6px 12px rgba(0,0,0,0.4)";
      });

      buttonContainer.addEventListener("mouseout", function () {
        buttonContainer.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";
      });

      // 将容器添加到窗口
      const browserBox = win.document.getElementById("browser");
      if (browserBox) {
        browserBox.appendChild(buttonContainer);
      } else {
        // 备用方案：添加到 document.documentElement
        win.document.documentElement.appendChild(buttonContainer);
      }

      Zotero.debug("Button with position toggle added successfully");
    });
  }
}
