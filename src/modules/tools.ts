import { config } from "../../package.json";
import { isChineseTopItem } from "./menu";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";

// 中国稀有姓氏统计小组发布于小红书ID4975028282
// https://www.xiaohongshu.com/discovery/item/67c017cb000000001203db3d
const compoundSurnames = [
  /* A */
  "奥屯",
  /* B */
  "百里",
  "比干",
  "单于",
  /* C */
  "陈留",
  "成公",
  "成功",
  "叱干",
  "褚师",
  "淳于",
  /* D */
  "达奚",
  "第二",
  "第五",
  "第伍",
  "第一",
  "丁若",
  "东方",
  "东里",
  "东门",
  "东野",
  "豆卢",
  "独孤",
  "端木",
  "段干",
  /* E */
  "尔朱",
  /* F */
  "伏羲",
  "状阳",
  "傅阳",
  /* G */
  "高堂",
  "高阳",
  "哥舒",
  "葛天",
  "公乘",
  "公上",
  "公孙",
  "公羊",
  "公冶",
  "共工",
  "古野",
  "关龙",
  "毌丘",
  /* H */
  "韩城",
  "贺兰",
  "贺楼",
  "贺若",
  "赫连",
  "呼延",
  "胡母",
  "胡毋",
  "斛律",
  "华原",
  "皇甫",
  "皇父",
  /* K */
  "可汗",
  /* J */
  "即墨",
  "夹谷",
  "揭阳",
  /* L */
  "令狐",
  "闾丘",
  "闾邱",
  /* M */
  "马服",
  "万矣",
  "墨台",
  "默台",
  "母丘",
  "木易",
  "慕容",
  /* N */
  "南宫",
  "南门",
  "女娲",
  /* O */
  "欧侯",
  "欧阳",
  /* P */
  "濮阳",
  "蒲察",
  /* Q */
  "漆雕",
  "亓官",
  "綦连",
  "綦毋",
  "气伏",
  "青阳",
  "屈男",
  "屈突",
  /* S */
  "上官",
  "申徒",
  "申屠",
  "石抹",
  "士孙",
  "侍其",
  "水丘",
  "司城",
  "司空",
  "司寇",
  "司马",
  "司徒",
  "司星",
  "澹台",
  /* T */
  "拓跋",
  "太史",
  "太叔",
  "徒单",
  "涂山",
  "脱脱",
  /* W */
  "完颜",
  "闻人",
  "武城",
  "毋丘",
  /* X */
  "西门",
  "夏侯",
  "夏后",
  "鲜于",
  "相里",
  "轩辕",
  /* Y */
  "延陵",
  "羊舌",
  "耶律",
  "宇文",
  "尉迟",
  "乐正",
  /* Z */
  "宰父",
  "长孙",
  "钟离",
  "诸葛",
  "术虎",
  "主父",
  "祝融",
  "颛孙",
  "颛项",
  "子车",
  "宗正",
  "宗政",
  /* 璧联姓 */
  "邓李",
  "刘付",
  "陆费",
  "吴刘",
];

export async function splitName(item: Zotero.Item): Promise<void> {
  const creators = item.getCreators();
  for (const creator of creators) {
    if (creator.fieldMode === 0 && creator.firstName !== "") continue;
    if (
      /\p{Unified_Ideograph}/u.test(`${creator.lastName}${creator.firstName}`)
    ) {
      const fullName = creator.lastName;
      const surname = compoundSurnames.find((surname) =>
        creator.lastName.startsWith(surname),
      );
      if (fullName.includes("·")) {
        const nameParts = fullName.split("·");
        creator.lastName = nameParts.shift()!;
        creator.firstName = nameParts.join("·");
      } else if (surname) {
        creator.lastName = surname;
        creator.firstName = fullName.slice(surname.length);
      } else {
        creator.lastName = fullName.charAt(0);
        creator.firstName = fullName.slice(1);
      }
      creator.fieldMode = 0;
    } else if (getPref("splitEnName") && /[a-z]/i.test(creator.lastName)) {
      const nameParts = creator.lastName.split(/\s+/g);
      if (nameParts.length > 1) {
        creator.lastName = nameParts.pop()!;
        creator.firstName = nameParts.join(" ");
        creator.fieldMode = 0;
      }
    }
  }
  item.setCreators(creators);
  await item.saveTx();
}

export async function mergeName(item: Zotero.Item): Promise<void> {
  const creators = item.getCreators();
  for (const creator of creators) {
    if (
      /\p{Unified_Ideograph}/u.test(`${creator.firstName}${creator.lastName}`)
    ) {
      // 由于拆分后信息丢失，难以判断少数民族的姓氏，这里的条件是充分不必要的
      const delimiter = creator.firstName.includes("·") ? "·" : "";
      creator.lastName = `${creator.lastName}${delimiter}${creator.firstName}`;
      creator.firstName = "";
      creator.fieldMode = 1;
    } else if (getPref("splitEnName") && /[a-z]/i.test(creator.lastName)) {
      creator.lastName = `${creator.firstName} ${creator.lastName}`.trimStart();
      creator.firstName = "";
      creator.fieldMode = 1;
    }
  }
  item.setCreators(creators);
  await item.saveTx();
}

export async function getCNKICite(item: Zotero.Item): Promise<string> {
  const searchOption = {
    title: item.getField("title"),
    author: item.getCreators()[0].lastName + item.getCreators()[0].firstName,
  };
  let cite = "";
  const searchResults = await addon.scraper.cnki?.search(searchOption);
  if (searchResults && searchResults.length > 0) {
    cite = searchResults[0].citation as string;
    ztoolkit.log(`CNKI citation: ${cite}`);
    if (cite) {
      ztoolkit.ExtraField.setExtraField(item, "CNKICite", cite);
    }
  }
  return cite;
}

export async function updateCNKICite(items: Zotero.Item[]) {
  const items2 = items.filter((i) => isChineseTopItem(i));
  if (items2.length > 0) {
    let popupWin;
    for (let i = 0; i < items2.length; i++) {
      const cite = await getCNKICite(items2[i]);
      if (i == 0) {
        popupWin = new ztoolkit.ProgressWindow(config.addonName, {
          closeOnClick: true,
          closeTime: 1500,
        })
          .createLine({
            text: `${getString("citation")}:${cite ? cite : "0"} ${items[i].getField("title")}`,
            type: "default",
            icon: `chrome://${config.addonRef}/content/icons/cite.png`,
          })
          .show();
      } else {
        popupWin?.changeLine({
          text: `${getString("citation")}:${cite ? cite : "0"} ${items[i].getField("title")}`,
          type: "default",
          icon: `chrome://${config.addonRef}/content/icons/cite.png`,
        });
      }
    }
  } else {
    ztoolkit.log("No Chinese items to update citation.");
    new ztoolkit.ProgressWindow(config.addonName, {
      closeOnClick: true,
      closeTime: 3500,
    })
      .createLine({
        text: getString("no-chinese-item-for-citation"),
        type: "default",
        icon: `chrome://${config.addonRef}/content/icons/cite.png`,
      })
      .show();
  }
}

async function renameAttachmentFromParent(attachmentItem: Zotero.Item) {
  if (
    !attachmentItem.isAttachment() ||
    attachmentItem.isTopLevelItem() ||
    attachmentItem.attachmentLinkMode == Zotero.Attachments.LINK_MODE_LINKED_URL
  ) {
    throw `Item ${attachmentItem.id} is not a child file attachment in ZoteroPane_Local.renameAttachmentFromParent()`;
  }

  const filePath = await attachmentItem.getFilePathAsync();
  if (!filePath) return;

  const parentItemID = attachmentItem.parentItemID as number;
  const parentItem = await Zotero.Items.getAsync(parentItemID);
  let newName = Zotero.Attachments.getFileBaseNameFromItem(parentItem);

  const extRE = /\.[^.]+$/;
  const origFilename = PathUtils.filename(filePath);
  const ext = origFilename.match(extRE);
  if (ext) {
    newName = newName + ext[0];
  }
  const origFilenameNoExt = origFilename.replace(extRE, "");

  const renamed = await attachmentItem.renameAttachmentFile(
    newName,
    false,
    true,
  );
  if (renamed !== true) {
    ztoolkit.log(`Could not rename file (${renamed})`);
  }

  // If the attachment title matched the filename, change it now
  const origTitle = attachmentItem.getField("title");
  if ([origFilename, origFilenameNoExt].includes(origTitle)) {
    attachmentItem.setField("title", newName);
    await attachmentItem.saveTx();
  }
}
