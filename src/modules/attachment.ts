import { getPref } from "../utils/prefs";

async function getAttachments(folder: string): Promise<string[] | false> {
  const attachmentTypes = ["caj", "pdf"];
  const children = await IOUtils.getChildren(folder);
  const attachmentFiles = children.filter((e) => {
    if (attachmentTypes.includes(e.slice(-3))) {
      const stat = Zotero.File.pathToFile(e);
      if (stat.isFile()) return true;
    }
  });
  if (!attachmentFiles) {
    ztoolkit.log("No attachments in this folder");
    return false;
  } else {
    return attachmentFiles;
  }
}


// 直接用SQL挑出没有附件的条目
async function getTargetItemIDs() {
  const sql = `select  t1.itemID from items t1 
    left join itemAnnotations t2 on t1.itemID = t2.itemID
    left join itemNotes t3 on t1.itemID = t3.itemID
    left join (
    select itemID from itemAttachments 
    union all 
    select parentItemID from itemAttachments where contentType != "text/html")
    t4 on t1.itemID = t4.itemID
    left join itemTypes t5 on t1.itemTypeID = t5.itemTypeID
    where t2.itemID is null and t3.itemID is null and t4.itemID is null
    and t5.typeName  in ("journalArticle",
    "preprint",
    "book",
    "thesis",
    "patent",
    "newspaperArticle",
    "bookSection",
    "conferencePaper")`;
  return await Zotero.DB.queryAsync(sql);
}


// Levenshtein Distance
// https://blog.bfw.wiki/user10/15628361709533090032.html
function ld(a: string, b: string) {
  if (a.length == 0) return b.length;
  if (b.length == 0) return a.length;

  const matrix = [];

  // increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  // increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1) // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

// 用于标题匹配，仅匹配标题，其他额外信息不管
// 从所有中挑一个标题匹配度最高的,距离最小的
function matchTitle(filename: string, item: Zotero.Item, method: string) {
  const title = item.getField("title") as string;
  let distance = 100;
  switch (method) {
    case "Levenshtein":
      distance = ld(title, filename);
      break;
  }
  return distance;
}


function findBestMatchItem(filename: string, itemIDs: any) {
  const distances = itemIDs.map((i: any) => {
    const item = Zotero.Items.get(i.id);
    return matchTitle(filename, item, 'Lavenshtein');
  })
  const minDistance = Math.min(...distances);
  const minIndex = distances.indexOf(minDistance);
  return itemIDs[minIndex].id;
}


async function scanFolder() {
  const pdfmatchfolder = getPref("pdfmatchfolder") as string;
  const itemIDs = await getTargetItemIDs();
  const attachFiles = await getAttachments(pdfmatchfolder)
  if (!attachFiles) return false;
  const result: any = {};
  attachFiles.forEach(f => {
    const filename = PathUtils.filename(f);
    const itemID = findBestMatchItem(filename, itemIDs);
    result[f] = itemID;
  });
  return result;
}