type OutlineNode = {
  level: number;
  title: string;
  pageIndex?: number;
  children?: OutlineNode[];
  collape?: boolean;
  style?: "bold" | "Italic";
};

type PdfRef = {
  num: number;
  gen: number;
};

type PdfZoomMode = {
  name: string; // 缩放模式名称，例如 "Fit", "XYZ", "FitH", "FitV"
  args?: (number | null)[];
};

type PdfOutlineNode = {
  title: string;
  items: PdfOutlineNode[];
  location: { dest: [PdfRef, PdfZoomMode] };
};

export async function getOutline(
  reader: _ZoteroTypes.ReaderInstance,
): Promise<OutlineNode[] | null> {
  const pdfDocument =
    // @ts-ignore - Not typed.
    reader._primaryView._iframeWindow.PDFViewerApplication.pdfDocument;
  const originOutline: PdfOutlineNode[] = await pdfDocument.getOutline2();

  if (originOutline.length == 0) return null;

  async function convert(
    node: PdfOutlineNode,
    level = 0,
  ): Promise<OutlineNode> {
    level += 1;
    const title = node.title;
    const outlineNode: OutlineNode = {
      level,
      title,
      children: [],
    };
    // Some pdf missing dest, position instead.
    if (node.location && node.location.dest) {
      const pageIndex = await pdfDocument.getPageIndex(node.location.dest[0]);
      outlineNode.pageIndex = pageIndex;
    }

    if (node.items.length > 0) {
      outlineNode.children = await Promise.all(
        node.items.map((n) => convert(n, level)),
      );
    }
    return outlineNode;
  }
  return Promise.all(originOutline.map((node) => convert(node, 0)));
}

export async function saveOutlineToJSON(
  item: Zotero.Item,
  outline: OutlineNode[],
) {
  const outlineStr = JSON.stringify(outline);
  const attachmentPath = await item.getFilePathAsync();
  if (attachmentPath == false) return;
  const attachmentFolder = PathUtils.parent(attachmentPath);
  await Zotero.File.putContentsAsync(
    PathUtils.join(attachmentFolder!, "outline.json"),
    outlineStr,
  );
}

export async function loadOutlineFromJSON(
  item: Zotero.Item,
  filepath: string,
): Promise<OutlineNode | null> {
  const attachmentPath = await item.getFilePathAsync();
  if (attachmentPath == false) return null;
  const attachmentFolder = PathUtils.parent(attachmentPath);
  const content = (await Zotero.File.getContentsAsync(
    PathUtils.join(attachmentFolder!, "outline.json"),
  )) as string;
  return JSON.parse(content);
}

function createNodes(
  nodes: OutlineNode[],
  parentElement: HTMLElement,
  doc: Document,
) {
  nodes.forEach((node) => {
    const li = ztoolkit.UI.createElement(doc, "li", {
      namespace: "html",
      classList:
        node.children && node.children.length > 0
          ? ["tree-item", "has-children"]
          : ["tree-item"],
      children: [
        {
          tag: "div",
          namespace: "html",
          classList: ["tree-node", `level-${node.level}`],
          attributes: { dragable: "true" },
          children: [
            {
              tag: "span",
              namespace: "html",
              classList: ["expander"],
              properties: {
                textContent:
                  node.children && node.children.length > 0 ? "▼" : " ",
              },
            },
            {
              tag: "div",
              namespace: "html",
              classList: ["node-content"],
              children: [
                {
                  tag: "span",
                  namespace: "html",
                  classList: ["node-title"],
                  properties: { textContent: node.title },
                },
              ],
            },
          ],
        },
      ],
    });

    // Add children node
    if (node.children && node.children.length > 0) {
      const ul = ztoolkit.UI.createElement(doc, "ul", {
        namespace: "html",
        classList: ["tree-list"],
      });
      createNodes(node.children, ul, doc);
      li.appendChild(ul);
    }
    // Now append the node to the parentElement.
    parentElement.appendChild(li);
    return li;
  });
}

export async function renderTree(doc: Document, data: OutlineNode[]) {
  const treeContainer = ztoolkit.UI.createElement(doc, "div", {
    classList: ["viewWrapper", "hidden"],
    children: [
      {
        tag: "div",
        namespace: "html",
        id: "j-outline-container",
        classList: ["outline-view"],
        attributes: {
          tabindex: "-1",
          "data-tabstop": "1",
          role: "tabpanel",
          "aria-labelledby": "j-outline-button",
        },
        children: [
          {
            tag: "ul",
            namespace: "html",
            id: "root-list",
            classList: ["tree-container"],
          },
        ],
      },
    ],
  });
  createNodes(data, treeContainer, doc);
  doc.querySelector("#sidebarContent")?.appendChild(treeContainer);

  // Hide or show side bar
  const hiddenMyOutline = (e: Event) => {
    ztoolkit.log(e.target as HTMLButtonElement, "clicked.");
    doc
      .getElementById("j-outline-viewer")
      ?.parentElement?.classList.toggle("hidden", true);
  };

  doc
    .getElementById("viewThumbnail")
    ?.addEventListener("click", hiddenMyOutline);
  doc
    .getElementById("viewAnnotations")
    ?.addEventListener("click", hiddenMyOutline);
  doc.getElementById("viewOutline")?.addEventListener("click", hiddenMyOutline);
}

// 为节点添加事件监听，以下为事件处理函数

function expandAll(doc: Document) {
  const collapsedNodes = doc.querySelectorAll(".tree-item.collapsed");
  collapsedNodes.forEach((node) => {
    node.classList.remove("collapsed");
  });
}

function collapseAll(doc: Document) {
  const parentNodes = doc.querySelectorAll(".tree-item.has-children");
  parentNodes.forEach((node) => {
    node.classList.add("collapsed");
  });
}

// 切换节点展开/折叠状态
function toggleNode(node: HTMLElement) {
  if (node.classList.contains("has-children")) {
    node.classList.toggle("collapsed");

    // 更新展开/折叠图标
    const expander = node.querySelector(".expander");
    if (node.classList.contains("collapsed")) {
      expander!.textContent = "►";
    } else {
      expander!.textContent = "▼";
    }
  }
}

// 选择节点
function selectNode(node: HTMLElement, doc: Document) {
  const selectedNode = doc.querySelector(".node-selected");
  // 取消之前的选择
  if (selectedNode) {
    selectedNode.classList.remove("node-selected");
  }

  // 设置新选择
  node.classList.add("node-selected");
}

// 添加新节点
function addNewNode(doc: Document) {
  const newTitle = "新书签";
  const selectedNode = doc.querySelector(".node-selected");

  // 如果没有选中节点，添加到根
  if (!selectedNode) {
    const rootList = doc.getElementById("root-list")!;
    createNodes([{ level: 0, title: newTitle }], rootList, doc);
  } else {
    // 添加为选中节点的子节点或兄弟节点
    const parentLi = selectedNode.closest("li")!;

    // 检查是否有子列表，如果没有，创建一个
    let childList = parentLi.querySelector("ul");
    if (!childList) {
      childList = ztoolkit.UI.createElement(doc, "ul", {
        classList: ["tree-list"],
      });
      parentLi.appendChild(childList);

      // 添加父节点标记并更新展开图标
      parentLi.classList.add("has-children");
      const expander = parentLi.querySelector(".expander")!;
      expander.textContent = "▼";
    }

    createNodes([{ level: 0, title: newTitle }], childList, doc);
    // 确保父节点展开
    parentLi.classList.remove("collapsed");
  }
}

// 删除选中节点
function deleteSelectedNode(doc: Document) {
  const selectedNode = doc.querySelector(".node-selected");
  if (!selectedNode) return;

  const listItem = selectedNode.closest("li")!;
  const parent = listItem.parentNode! as HTMLElement;

  // 移除节点
  parent.removeChild(listItem);

  // 如果父列表没有其他子元素，更新其父节点的状态
  if (
    parent.children.length === 0 &&
    parent.tagName === "UL" &&
    parent !== doc.getElementById("root-list")
  ) {
    const parentLi = parent.parentNode! as HTMLElement;
    parentLi.removeChild(parent);
    parentLi.classList.remove("has-children");
    const expander = parentLi.querySelector(".expander")!;
    expander.textContent = " ";
  }
}

// 使节点可编辑
function makeNodeEditable(titleElement: HTMLElement, doc: Document) {
  const currentText = titleElement.textContent as string;
  const input = doc.createElement("input");
  input.type = "text";
  input.classList.add("node-edit");
  input.value = currentText;

  const parent = titleElement.parentNode!;
  parent.replaceChild(input, titleElement);

  input.focus();
  input.select();

  function handleBlurEdit(e: FocusEvent) {
    const newText = input.value.trim() || currentText;
    titleElement.textContent = newText;
    parent.replaceChild(titleElement, input);
  }

  function handleKeyDownEdit(e: KeyboardEvent) {
    if (e.key === "Enter") {
      const newText = input.value.trim() || currentText;
      titleElement.textContent = newText;
      parent.replaceChild(titleElement, input);
    } else if (e.key === "Escape") {
      parent.replaceChild(titleElement, input);
    }
  }

  input.addEventListener("blur", handleBlurEdit);
  input.addEventListener("keydown", handleKeyDownEdit);
}

// 拖拽开始，处理拖拽的节点
function handleDragStart(e: DragEvent) {
  if (!(e.target instanceof HTMLElement)) return;
  if (!e.target.classList.contains("tree-node")) return;

  const draggedNode = e.target.closest("li") as HTMLElement;
  e.dataTransfer!.setData("text/plain", draggedNode.innerText);
  e.dataTransfer!.effectAllowed = "move";

  // 为拖拽中的元素添加样式
  setTimeout(() => {
    draggedNode.classList.add("dragging");
  }, 0);
}

// 拖拽经过目标元素
function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = "move";

  if (!(e.target instanceof HTMLElement)) return;
  // 找到最近的节点元素
  const targetNode = e.target!.closest(".tree-node");
  if (!targetNode) return;

  // 添加可放置样式
  targetNode.classList.add("dragover");
}

// 拖拽离开目标元素
function handleDragLeave(e: DragEvent) {
  if (!(e.target instanceof HTMLElement)) return;
  const targetNode = e.target.closest(".tree-node");
  if (!targetNode) return;

  // 移除可放置样式
  targetNode.classList.remove("dragover");
}

// 处理放置
function handleDrop(e: DragEvent) {
  e.preventDefault();
  if (!(e.target instanceof HTMLElement)) return;
  const doc = e.target.ownerDocument;
  const draggedNode = doc.querySelector(".dragging");
  if (!draggedNode) return;
  // 获取目标节点
  const targetTreeNode = e.target.closest(".tree-node");
  if (!targetTreeNode) return;

  // 移除可放置样式
  targetTreeNode.classList.remove("dragover");

  // 获取目标列表项
  const targetLi = targetTreeNode.closest("li")!;

  // 不能将节点拖到自己或其子节点上
  if (draggedNode === targetLi || isAncestor(draggedNode, targetLi)) {
    return;
  }

  // 移除拖拽的节点
  const oldParent = draggedNode.parentNode! as HTMLElement;
  oldParent.removeChild(draggedNode);

  // 判断放置位置：是作为子节点还是兄弟节点
  const dropPosition = determineDropPosition(e, targetTreeNode);

  if (dropPosition === "child") {
    // 作为子节点
    let targetUl = targetLi.querySelector("ul");

    // 如果没有子列表，创建一个
    if (!targetUl) {
      targetUl = doc.createElement("ul");
      targetUl.classList.add("tree-list");
      targetLi.appendChild(targetUl);

      // 更新父节点状态
      targetLi.classList.add("has-children");
      const expander = targetLi.querySelector(".expander")!;
      expander.textContent = "▼";
    }

    // 确保目标节点展开
    targetLi.classList.remove("collapsed");

    // 添加到子列表
    targetUl.appendChild(draggedNode);
  } else {
    // 作为兄弟节点
    const targetParent = targetLi.parentNode!;

    if (dropPosition === "before") {
      targetParent.insertBefore(draggedNode, targetLi);
    } else {
      // 'after'
      targetParent.insertBefore(draggedNode, targetLi.nextSibling);
    }
  }

  // 如果原父列表为空，更新其父节点状态
  if (
    oldParent.children.length === 0 &&
    oldParent.tagName === "UL" &&
    oldParent !== doc.getElementById("root-list")
  ) {
    const oldGrandParent = oldParent.parentNode as HTMLElement;
    oldGrandParent.removeChild(oldParent);
    oldGrandParent.classList.remove("has-children");
    const expander = oldGrandParent.querySelector(".expander")!;
    expander.textContent = " ";
  }

  // 更新节点级别样式
  updateNodeLevels(draggedNode);
}

// 拖拽结束
function handleDragEnd(e: DragEvent) {
  if (!(e.target instanceof HTMLElement)) return;
  const doc = e.target.ownerDocument;
  const draggedNode = doc.querySelector(".dragging");
  if (!draggedNode) return;

  draggedNode.classList.remove("dragging");

  // 清除所有dragover样式
  doc.querySelectorAll(".dragover").forEach((el) => {
    el.classList.remove("dragover");
  });
}

// 检查一个节点是否是另一个节点的祖先
function isAncestor(ancestor: HTMLElement, descendant: HTMLElement) {
  let current = descendant.parentNode;
  const doc = ancestor.ownerDocument;
  while (current && current !== doc.body) {
    if (current === ancestor) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

// 确定放置位置：作为子节点、同级前面或同级后面
function determineDropPosition(event: DragEvent, targetNode: HTMLElement) {
  const rect = targetNode.getBoundingClientRect();
  const mouseY = event.clientY;

  // 上三分之一区域放在前面，下三分之一区域放在后面，中间放在内部
  const relativeY = mouseY - rect.top;
  const height = rect.height;

  if (relativeY < height / 3) {
    return "before";
  } else if (relativeY > (height * 2) / 3) {
    return "after";
  } else {
    return "child";
  }
}

// 更新节点及其子节点的级别样式
function updateNodeLevels(node: HTMLElement) {
  const updateLevel = (element: Element, level: number) => {
    const nodeDiv = element.querySelector(".tree-node")!;

    // 移除所有级别类
    for (let i = 0; i < 10; i++) {
      nodeDiv.classList.remove(`level-${i}`);
    }

    // 添加正确的级别类
    nodeDiv.classList.add(`level-${level}`);

    // 递归处理子节点
    const childList = element.querySelector("ul");
    if (childList) {
      Array.from(childList.children).forEach((child) => {
        updateLevel(child, level + 1);
      });
    }
  };

  // 计算当前节点的级别
  let level = 0;
  let parent = node.parentNode as Element;

  while (parent && parent.id !== "root-list") {
    if (parent.tagName === "UL") {
      level++;
    }
    parent = parent.parentNode as Element;
  }

  updateLevel(node, level);
}
