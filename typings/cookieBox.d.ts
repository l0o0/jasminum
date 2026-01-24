declare namespace Zotero {
  /**
   * Cookie 对象的内部存储结构
   */
  interface CookieData {
    /** Cookie 的值 */
    value: string;
    /** 是否为 secure cookie */
    secure: boolean;
    /** 是否为 host-only cookie */
    hostOnly: boolean;
  }

  /**
   * Cookie 存储的内部结构
   * 格式: { ".host": { "/path": { "cookieName": CookieData } } }
   */
  interface CookieStorage {
    [host: string]: {
      [path: string]: {
        [name: string]: CookieData;
      };
    };
  }

  /**
   * getCookiesForURI 返回的简单 cookie 对象
   * 格式: { "cookieName": "cookieValue" }
   */
  interface CookieDict {
    [name: string]: string;
  }

  /**
   * Manage cookies in a sandboxed fashion
   */
  class CookieSandbox {
    /**
     * Internal cookie storage
     * @internal
     */
    _cookies: CookieStorage;

    /**
     * User agent string to use for sandboxed requests
     */
    userAgent?: string;

    /**
     * Create a new CookieSandbox instance
     *
     * @param browser - Hidden browser object
     * @param uri - URI of page to manage cookies for (cookies for domains that are not subdomains of this URI are ignored)
     * @param cookieData - Cookies with which to initiate the sandbox
     * @param userAgent - User agent to use for sandboxed requests
     *
     * @example
     * ```typescript
     * // Create an empty sandbox
     * const sandbox = new Zotero.CookieSandbox();
     *
     * // Create with initial cookies
     * const sandbox = new Zotero.CookieSandbox(
     *   null,
     *   "https://example.com",
     *   "sessionId=abc123; userId=456"
     * );
     * ```
     */
    constructor(
      browser?: any,
      uri?: string | Components.interfaces.nsIURI,
      cookieData?: string,
      userAgent?: string,
    );

    /**
     * Clone this CookieSandbox
     *
     * @returns A deep copy of this CookieSandbox
     */
    clone(): CookieSandbox;

    /**
     * Add cookies to this CookieSandbox based on a cookie header
     *
     * @param cookieString - Cookie header string (can contain multiple cookies separated by newlines)
     * @param uri - URI of the header origin. Used to verify same origin. If omitted, validation is not performed
     */
    addCookiesFromHeader(
      cookieString: string,
      uri?: Components.interfaces.nsIURI,
    ): void;

    /**
     * Attach CookieSandbox to a specific browser
     *
     * @param browser - Browser element to attach to
     */
    attachToBrowser(browser: any): void;

    /**
     * Attach CookieSandbox to a specific XMLHttpRequest
     *
     * @param ir - Interface requestor
     */
    attachToInterfaceRequestor(
      ir: Components.interfaces.nsIInterfaceRequestor | any,
    ): void;

    /**
     * Set a cookie for a specified host
     *
     * @param cookiePair - A single cookie pair in the form "key=value"
     * @param host - Host to bind the cookie to
     * @param path - Cookie path (defaults to "/")
     * @param secure - Whether the cookie has the secure attribute set
     * @param hostOnly - Whether the cookie is a host-only cookie
     */
    setCookie(
      cookiePair: string,
      host: string,
      path?: string,
      secure?: boolean,
      hostOnly?: boolean,
    ): void;

    /**
     * Returns a list of cookies that should be sent to the given URI
     *
     * @param uri - The URI to get cookies for (must be nsIURI object, not string)
     * @returns Object containing cookie name-value pairs, or null if no cookies found
     */
    getCookiesForURI(uri: Components.interfaces.nsIURI): CookieDict | null;

    /**
     * Internal method to get cookies for a specific path
     * @internal
     */
    _getCookiesForPath(
      cookies: CookieDict,
      cookiePaths: any,
      pathParts: string[],
      secure: boolean,
      isHost: boolean,
    ): boolean;
  }

  namespace CookieSandbox {
    /**
     * Initialize the CookieSandbox observer
     */
    function init(): void;

    /**
     * Normalize the host string: lower-case, remove leading period, some more cleanup
     *
     * @param host - Host string to normalize
     * @returns Normalized host string
     */
    function normalizeHost(host: string): string;

    /**
     * Normalize the path string
     *
     * @param path - Path string to normalize
     * @returns Normalized path string
     */
    function normalizePath(path: string): string;

    /**
     * Generate a semicolon-separated string of cookie values from a cookie object
     *
     * @param cookies - Object containing key-value cookie pairs
     * @returns Cookie string in format "name1=value1; name2=value2"
     */
    function generateCookieString(cookies: CookieDict): string;

    /**
     * Observer for managing cookies across different contexts
     */
    namespace Observer {
      /** WeakMap of browsers tracked by CookieSandbox */
      const trackedBrowsers: WeakMap<any, CookieSandbox>;

      /** WeakMap of interface requestors tracked by CookieSandbox */
      const trackedInterfaceRequestors: WeakMap<any, CookieSandbox>;

      /**
       * Register the cookie observer
       */
      function register(): void;

      /**
       * Observe HTTP events to manage cookies
       *
       * @param channel - HTTP channel
       * @param topic - Observer topic
       */
      function observe(channel: any, topic: string): void;
    }
  }
}
