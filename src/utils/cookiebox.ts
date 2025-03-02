import { getPref } from "./prefs";

export class MyCookieSandbox {
  public searchCookieBox: Zotero.CookieSandbox;
  public attachmentCookieBox: Zotero.CookieSandbox;
  public refCookieBox: Zotero.CookieSandbox;
  userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.77 Safari/537.36";
  baseUrl = "https://cnki.net/";

  constructor() {
    this.searchCookieBox = this.setSearchCookieBox();
    this.attachmentCookieBox = this.setAttachmentCookieBox();
    this.refCookieBox = this.setRefCookieSandbox();
  }

  setSearchCookieBox() {
    const cookieData =
      "Ecp_ClientId=1200104193103044969; " +
      "tfstk=gH8qen2tRNvSl_Z8K_ba4sh1HQjASZkCoF61sCAGGtXDhC6M4dv5lIOM1P5GEpjbIZAf7hJ6pn6mMPOMQCRhjd66GfPvzpz_lxnvsP7CSvMIR2OYMNQidgdAMKeA116i5i4mrZC1sCFlC2OvM7bidvgIRRSLsHRcIdjcr4fAEs2cnd4lqTCOs-fgobRleTfgnibgqzf16-fDINcyZTCGSOAYeNbQz1Im_tkxXAnJ4iWHiTzUwU5l1odVU-ef3ysVKJ6zSPYPMQLsgFam8TxXjE_koYcfrEJ2ogJg_uW6kKTPYeDuz_dD3HjHogJzB_vwoFK4Ilj05_WIablPbsQzR7aN3lEODQCPdjc0XlIcV_WIabrTXiwFa9Gmi; " +
      "SID_sug=018108; " +
      "SID_kns_new=kns2618107;";
    // @ts-ignore - Not typed.
    return new Zotero.CookieSandbox(
      null,
      this.baseUrl,
      cookieData,
      this.userAgent,
    );
  }

  setAttachmentCookieBox() {
    const cookieData = getPref("cnkiAttachmentCookie");
    // @ts-ignore - Not typed.
    return new Zotero.CookieSandbox(
      null,
      this.baseUrl,
      cookieData,
      this.userAgent,
    );
  }

  setRefCookieSandbox() {
    const cookieData =
      "Ecp_ClientId=1200104193103044969; RsPerPage=20; " +
      "cnkiUserKey=60c42f4d-35a2-6d3f-6efc-ad01eaffd4c3; " +
      "ASP.NET_SessionId=zcw1abnl5vitqcliiq5almmj; " +
      "SID_kns8=123121; Ecp_IpLoginFail=20110839.182.10.65; " +
      "SID_recommendapi=125144; CurrSortFieldType=desc; " +
      "SID_kns=025123117; " +
      "CurrSortField=%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2f(%e5%8f%91%e8%a1%a8%e6%97%b6%e9%97%b4%2c%27TIME%27); " +
      "SID_kcms=124117; " +
      "_pk_ref=%5B%22%22%2C%22%22%2C1604847086%2C%22https%3A%2F%2Fcnki.net%2F%22%5D; " +
      "_pk_ses=*";
    // @ts-ignore - Not typed.
    return new Zotero.CookieSandbox(
      null,
      this.baseUrl,
      cookieData,
      this.userAgent,
    );
  }

  // Update cookiebox when attachment old cookie is outdated.
  updateAttachmentCookieBox() {
    this.attachmentCookieBox = this.setAttachmentCookieBox();
  }
}
