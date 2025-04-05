import { get } from "http";
import { saveOutlineToJSON, createTreeNodes } from "./outline";
import { ICONS } from "./style";
import { getString } from "../../utils/locale";

const MAX_LEVEL = 7;

function getReaderPagePosition(): PdfPosition {
  const reader = Zotero.Reader.getByTabID(
    ztoolkit.getGlobal("Zotero_Tabs").selectedID,
  );
  const primaryView = reader._internalReader
    ._primaryView as _ZoteroTypes.Reader.PDFView;
  const PDFViewerApplication = primaryView._iframeWindow!.PDFViewerApplication;
  const doc = primaryView._iframeWindow!.document;
  const container = doc.getElementById("viewerContainer")!;
  const pageIndex = PDFViewerApplication.pdfViewer!.currentPageNumber - 1;
  const pageView = PDFViewerApplication.pdfViewer!.getPageView(pageIndex);
  const viewport = pageView.viewport;
  // const scrollX = container.scrollLeft - pageView.div.offsetLeft;
  const scrollX = 0;
  const scrollY = container.scrollTop - pageView.div.offsetTop;
  const [x, y] = viewport.convertToPdfPoint(scrollX, scrollY);
  ztoolkit.log(
    "get position",
    pageIndex + 1,
    container.scrollTop,
    scrollX,
    scrollY,
    x,
    y,
  );
  return { position: { pageIndex, rects: [[x, y, x, y]] } };
}

export function initEventListener(doc: Document) {
  // Hide or show side bar
  function hiddenMyOutlineAndBar(e: Event) {
    ztoolkit.log(e.target as HTMLButtonElement, "clicke to hide outline");
    doc
      .getElementById("j-outline-viewer")
      ?.parentElement?.classList.toggle("hidden", true);
    doc
      .getElementById("j-outline-toolbar")
      ?.classList.toggle("j-outline-hidden", true);
    doc.getElementById("j-outline-button")?.classList.toggle("active", false);

    const targetElement = e.target as HTMLButtonElement;
    // Zotero outline and annations list can not work as expected.
    if (targetElement.id === "viewOutline") {
      doc
        .getElementById("outlineView")
        ?.parentElement?.classList.toggle("hidden", false);
    } else if (targetElement.id === "viewAnnotations") {
      doc.getElementById("annotationsView")?.classList.toggle("hidden", false);
    }
  }
  // 给默认按钮添加事件，避免切换面板时异常
  doc
    .getElementById("viewThumbnail")
    ?.addEventListener("click", hiddenMyOutlineAndBar);
  doc
    .getElementById("viewAnnotations")
    ?.addEventListener("click", hiddenMyOutlineAndBar);
  doc
    .getElementById("viewOutline")
    ?.addEventListener("click", hiddenMyOutlineAndBar);

  const treeContainer = doc.getElementById("j-outline-viewer");
  if (!treeContainer) return;

  // 节点展开/折叠事件，选中节点
  treeContainer // 节点点击选择事件
    .addEventListener("click", function (e: Event) {
      const target = e.target as HTMLElement;
      ztoolkit.log("click container", e.target);
      // 检查是否点击的是展开/折叠图标
      if (target.closest("span")!.classList.contains("expander")) {
        ztoolkit.log("click expander");
        const listItem = target.closest("li");
        if (!listItem) return;
        toggleNode(listItem);
        e.stopPropagation();
        return;
      }

      // 节点选择
      if (target.closest(".tree-node")) {
        selectNode(target.closest(".tree-node")!);
        clickToPosition(target);
      }
    });

  // 双击编辑节点
  treeContainer.addEventListener("dblclick", function (e) {
    if ((e.target as Element).classList.contains("node-title")) {
      makeNodeEditable(e.target as Element);
      e.stopPropagation();
    }
  });

  // 书签上方工具栏事件
  doc
    .getElementById("j-outline-expand-all")
    ?.addEventListener("click", expandAll);
  doc
    .getElementById("j-outline-collapse-all")
    ?.addEventListener("click", collapseAll);
  doc
    .getElementById("j-outline-add-node")
    ?.addEventListener("click", addNewNode);
  doc
    .getElementById("j-outline-delete-node")
    ?.addEventListener("click", deleteSelectedNode);

  // 拖拽相关事件
  treeContainer.addEventListener("dragstart", handleDragStart);
  treeContainer.addEventListener("dragover", handleDragOver);
  treeContainer.addEventListener("dragleave", handleDragLeave);
  treeContainer.addEventListener("drop", handleDrop);
  treeContainer.addEventListener("dragend", handleDragEnd);

  // 处理键盘事件
  treeContainer.addEventListener("keydown", handleKeydownEvent);

  // 点击书签跳转到具体页码
}

// 为节点添加事件监听，以下为事件处理函数
function expandAll(ev: Event) {
  const doc = (ev.target as Element).ownerDocument;
  const collapsedNodes = doc.querySelectorAll(".tree-item.collapsed");
  collapsedNodes.forEach((node) => {
    node.classList.remove("collapsed");

    const expander = node.querySelector(".expander");
    if (expander?.hasChildNodes()) {
      //expander!.textContent = "▼";
      expander!.innerHTML = ICONS.down;
    }
  });
}

function collapseAll(ev: Event) {
  const doc = (ev.target as Element).ownerDocument;
  const parentNodes = doc.querySelectorAll(".tree-item.has-children");
  parentNodes.forEach((node) => {
    node.classList.add("collapsed");
    const expander = node.querySelector(".expander");
    if (expander?.hasChildNodes()) {
      //expander!.textContent = "►";
      expander!.innerHTML = ICONS.right;
    }
  });
}

// 切换节点展开/折叠状态
function toggleNode(node: Element) {
  if (node.classList.contains("has-children")) {
    node.classList.toggle("collapsed");

    // 更新展开/折叠图标
    const expander = node.querySelector(".expander");
    if (node.classList.contains("collapsed")) {
      //expander!.textContent = "►";
      expander!.innerHTML = ICONS.right;
    } else {
      //expander!.textContent = "▼";
      expander!.innerHTML = ICONS.down;
    }
  }
}

// 选择节点
function selectNode(node: Element) {
  const doc = node.ownerDocument;
  const selectedNode = doc.querySelector(".node-selected");
  // 取消之前的选择
  if (selectedNode) {
    selectedNode.classList.remove("node-selected");
  }

  // 设置新选择
  node.classList.add("node-selected");
}

// Key events for the outline panel.
export function handleKeydownEvent(ev: KeyboardEvent) {
  const newPanel = (ev.target! as Element).ownerDocument.getElementById(
    "root-list",
  )!;
  const nodes = Array.from(newPanel.querySelectorAll("div.tree-node"));
  const selectedNode = newPanel.querySelector("div.tree-node.node-selected");
  let currentIdx = nodes.indexOf(selectedNode as Element);
  ztoolkit.log("Keydown event", currentIdx, ev);
  if (ev.type === "keydown" && ev.key === "ArrowDown") {
    while (currentIdx < nodes.length - 1) {
      const nextNode = nodes[currentIdx + 1] as HTMLElement;
      // ztoolkit.log("Next node", currentIdx, nextNode);
      if (nextNode && nextNode.checkVisibility()) {
        nextNode.querySelector<HTMLElement>("span.node-title")!.click();
        nextNode.focus();
        break;
      }
      currentIdx += 1;
    }
  }
  if (ev.key === "ArrowUp") {
    while (currentIdx > 0) {
      const nextNode = nodes[currentIdx - 1] as HTMLElement;
      if (nextNode && nextNode.checkVisibility()) {
        nextNode.querySelector<HTMLElement>("span.node-title")!.click();
        nextNode.focus();
        break;
      }
      currentIdx -= 1;
    }
  }

  if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
    (selectedNode?.querySelector("span.expander") as HTMLElement).click();
  }

  if (ev.key === " ") {
    ztoolkit.log("Space key pressed", selectedNode);
    ev.preventDefault();
    makeNodeEditable(
      selectedNode!.querySelector<HTMLElement>("span.node-title")!,
    );
  }

  if (ev.key === "Delete" || ev.key === "Backspace") {
    ztoolkit.log("Delete key pressed");
    deleteSelectedNode(ev);
  }
}

export function handleDragStart(e: DragEvent) {
  // if (!(e.target instanceof HTMLElement)) return;
  ztoolkit.log(" start to drag");
  const target = e.target as Element;
  if (!target.classList.contains("tree-node")) return;

  const draggedNode = target.closest("li") as HTMLElement;
  e.dataTransfer!.setData("text/plain", draggedNode.innerText);
  e.dataTransfer!.effectAllowed = "move";

  // 为拖拽中的元素添加样式
  setTimeout(() => {
    draggedNode.classList.add("dragging");
  }, 0);
}

// 拖拽经过目标元素
export function handleDragOver(e: DragEvent) {
  e.preventDefault();
  e.dataTransfer!.dropEffect = "move";
  const target = e.target as HTMLElement;
  const doc = target.ownerDocument;
  // 修复坐标异常
  const upperHeight =
    doc.querySelector("html")?.getBoundingClientRect().height || 41;
  const draggedNode = doc.querySelector(".dragging");
  if (!draggedNode) return;

  // if (!(e.target instanceof HTMLElement)) return;
  // 找到最近的节点元素
  const targetNode = target.closest(".tree-node");
  if (!targetNode) {
    hideDropIndicator(doc);
    return;
  }

  // 不能拖拽到自己或自己的子元素
  const targetLi = targetNode.closest("li") as Element;
  if (draggedNode === targetLi || isAncestor(draggedNode, targetLi)) {
    hideDropIndicator(doc);
    return;
  }

  // 计算拖拽位置（上方、中间放入其中、下方）
  const rect = targetNode.getBoundingClientRect();
  const mouseY = e.clientY;
  const relativeY = mouseY - rect.top;
  const height = rect.height;

  let dropPosition;
  if (relativeY < height * 0.25) {
    dropPosition = "before";
  } else if (relativeY > height * 0.75) {
    dropPosition = "after";
  } else {
    dropPosition = "inside";
  }

  // 如果位置或目标变化了，才更新指示器
  // 临时数据暂时存储在window中
  if (
    doc.defaultView!.lastDropPosition !== dropPosition ||
    doc.defaultView!.lastDropTarget !== targetLi
  ) {
    updateDropIndicator(targetNode, dropPosition, upperHeight);
    doc.defaultView!.lastDropPosition = dropPosition;
    doc.defaultView!.lastDropTarget = targetLi;
  }

  // 添加可放置样式
  doc.querySelectorAll(".dragover").forEach((el) => {
    el.classList.remove("dragover");
  });
  targetNode.classList.add("dragover");
}

function updateDropIndicator(
  targetNode: Element,
  position: string,
  upperHeight: number,
) {
  const rect = targetNode.getBoundingClientRect();
  const doc = targetNode.ownerDocument;
  const dropIndicator = doc.querySelector(".drop-indicator") as HTMLElement;

  // 清除所有位置类
  dropIndicator.classList.remove("top", "middle", "bottom");
  dropIndicator.classList.add("visible");
  ztoolkit.log(
    "updateDropIndicator",
    targetNode.textContent,
    position,
    rect.toJSON(),
  );
  if (position === "before") {
    dropIndicator.classList.add("top");
    dropIndicator.style.left = `${rect.left}px`;
    dropIndicator.style.top = `${rect.top - 2 - upperHeight}px`;
    dropIndicator.style.width = `${rect.width}px`;
  } else if (position === "after") {
    dropIndicator.classList.add("bottom");
    dropIndicator.style.left = `${rect.left}px`;
    dropIndicator.style.top = `${rect.bottom - upperHeight}px`;
    dropIndicator.style.width = `${rect.width}px`;
  } else {
    // inside position
    dropIndicator.classList.add("middle");
    dropIndicator.style.left = `${rect.left + 20}px`;
    dropIndicator.style.top = `${rect.top + rect.height / 2 - upperHeight}px`;
    dropIndicator.style.width = `${rect.width - 25}px`;
  }
}

function hideDropIndicator(doc: Document) {
  const dropIndicator = doc.querySelector(".drop-indicator")!;
  dropIndicator.classList.remove("visible");
  doc.defaultView!.lastDropPosition = null;
  doc.defaultView!.lastDropTarget = null;
}

// 拖拽离开目标元素
export function handleDragLeave(e: DragEvent) {
  const doc = (e.target as Element).ownerDocument;
  if (
    !e.relatedTarget ||
    !(e.relatedTarget as Element).closest("#j-outline-viewer")
  ) {
    hideDropIndicator(doc);
  }

  const targetNode = (e.target as HTMLElement).closest(".tree-node");
  if (targetNode) {
    // 移除可放置样式
    targetNode.classList.remove("dragover");
  }
}

// 处理放置
export async function handleDrop(e: DragEvent) {
  e.preventDefault();
  // if (!(e.target instanceof HTMLElement)) return;
  const target = e.target as HTMLElement;
  const doc = target.ownerDocument;
  const draggedNode = doc.querySelector(".dragging");

  // 隐藏指示器
  hideDropIndicator(doc);

  if (!draggedNode) return;
  // 获取目标节点
  const targetTreeNode = target.closest(".tree-node");
  if (!targetTreeNode) return;

  // 移除可放置样式
  doc.querySelectorAll(".dragover").forEach((el) => {
    el.classList.remove("dragover");
  });
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
      // expander.textContent = "▼";
      expander.innerHTML = ICONS.down;
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

  // 保存节点信息
  await saveOutlineToJSON();
}

// 拖拽结束
export function handleDragEnd(e: DragEvent) {
  // if (!(e.target instanceof HTMLElement)) return;
  const doc = (e.target as HTMLElement).ownerDocument;
  const draggedNode = doc.querySelector(".dragging");
  if (!draggedNode) return;

  draggedNode.classList.remove("dragging");

  // 隐藏指示器
  hideDropIndicator(doc);

  // 清除所有dragover样式
  doc.querySelectorAll(".dragover").forEach((el) => {
    el.classList.remove("dragover");
  });
}

// 检查一个节点是否是另一个节点的祖先
function isAncestor(ancestor: Element, descendant: Element) {
  let current = descendant.parentNode;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

// 确定放置位置：作为子节点、同级前面或同级后面
function determineDropPosition(event: DragEvent, targetNode: Element) {
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
function updateNodeLevels(node: Element) {
  const updateLevel = (element: Element, level: number) => {
    const nodeDiv = element.querySelector(".tree-node")!;

    // 移除所有级别类
    for (let i = 1; i <= MAX_LEVEL; i++) {
      nodeDiv.classList.remove(`level-${i}`);
    }

    // 添加正确的级别类
    nodeDiv.classList.add(`level-${level}`);
    nodeDiv.setAttribute("level", level.toString());

    // 递归处理子节点
    const childList = element.querySelector("ul");
    if (childList) {
      Array.from(childList.children).forEach((child) => {
        updateLevel(child, level + 1);
      });
    }
  };

  // 计算当前节点的级别
  let level = 1;
  let parent = node.parentNode as Element;

  while (parent && parent.id !== "root-list") {
    if (parent.tagName === "UL") {
      level++;
    }
    parent = parent.parentNode as Element;
  }

  updateLevel(node, level);
}

export function makeNodeEditable(titleElement: Element) {
  const doc = titleElement.ownerDocument;
  const parent = titleElement.parentNode! as Element;
  const treeNode = titleElement.closest("div.tree-node")!;
  // 获取当前值
  const currentTitle = titleElement.textContent || "";
  const currentPage = treeNode.getAttribute("page")!;

  // 创建容器
  const container = doc.createElement("div");
  container.style.display = "flex";
  container.style.gap = "5px";

  // 创建标题输入框
  const titleInput = doc.createElement("input");
  titleInput.type = "text";
  titleInput.value = currentTitle.trim();
  titleInput.placeholder = getString("outline-edit-placeholder");

  // 替换原始元素
  container.appendChild(titleInput);
  // container.appendChild(pageInput);
  parent.replaceChild(container, titleElement);

  // 聚焦到标题输入框
  titleInput.focus();
  // 禁用拖拽功能
  treeNode.setAttribute("draggable", "false");

  // 保存逻辑
  const saveChanges = async () => {
    const newTitle = titleInput.value.trim();

    // 更新原始元素
    titleElement.textContent = newTitle || currentTitle;
    titleElement.setAttribute("title", `${newTitle}, Page: ${currentPage}`);
    treeNode.setAttribute("page", currentPage);

    // 恢复 DOM 结构
    parent.replaceChild(titleElement, container);
    // 恢复拖拽功能
    treeNode.setAttribute("draggable", "true");

    // 保存节点信息
    await saveOutlineToJSON();
  };

  // 事件处理
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      saveChanges();
      doc.getElementById("j-outline-viewer")!.focus();
    } else if (e.key === "Escape") {
      parent.replaceChild(titleElement, container);
    }
    e.stopPropagation();
    // 保留焦点
  };

  const handleBlur = (e: FocusEvent) => {
    if (!container.contains(e.relatedTarget as Node)) {
      saveChanges();
    }
  };

  // 绑定事件
  titleInput.addEventListener("keydown", handleKeyDown);
  container.addEventListener("blur", handleBlur, true);
}

// 删除选中节点
export async function deleteSelectedNode(ev: Event) {
  const doc = (ev.target as Element).ownerDocument;
  const selectedNode = doc.querySelector(".node-selected");
  const rootNode = doc.getElementById("root-list");
  if (!selectedNode || !rootNode) return;

  const listItem = selectedNode.closest("li")!;
  const parent = listItem.parentNode as HTMLElement;

  // 如果有子节点，则进行提示确认是否删除
  if (listItem.classList.contains("has-children")) {
    const confirmDelete = ztoolkit.getGlobal("confirm")(
      getString("outline-delete-confirm"),
    );
    if (!confirmDelete) return;
  }
  // 移除节点
  parent.removeChild(listItem);

  // 如果父列表没有其他子元素，更新其父节点的状态
  if (
    parent.children.length === 0 &&
    parent.tagName === "UL" &&
    parent !== doc.getElementById("root-list")
  ) {
    const parentLi = parent.parentNode as HTMLElement;
    parentLi.removeChild(parent);
    parentLi.classList.remove("has-children");
    const expander = parentLi.querySelector(".expander")!;
    expander.textContent = " ";
  }

  // 保存节点信息
  await saveOutlineToJSON();

  if (!rootNode.hasChildNodes()) {
    ztoolkit.UI.appendElement(
      {
        tag: "div",
        namespace: "html",
        classList: ["empty-outline-prompt"],
        properties: {
          innerHTML: getString("outline-empty-prompt", {
            args: { icon: ICONS.add },
          }),
        },
      },
      rootNode,
    );
  }
}

// 添加新节点
export async function addNewNode(ev: Event) {
  const doc = (ev.target as Element).ownerDocument;
  const newTitle = "新书签";
  const selectedNode = doc.querySelector(".node-selected");
  const location = getReaderPagePosition();

  // 如果没有选中节点，添加到根
  if (!selectedNode) {
    const rootList = doc.getElementById("root-list")!;
    createTreeNodes(
      [
        {
          level: 1,
          title: newTitle,
          page: location.position.pageIndex + 1,
          x: location.position.rects[0][0],
          y: location.position.rects[0][1],
        },
      ],
      rootList,
      doc,
    );
    doc.querySelector(".empty-outline-prompt")?.classList.add("hidden");
  } else {
    // 添加为选中节点的子节点或兄弟节点
    const parentLi = selectedNode.closest("li.tree-item")!;
    const parentLevel = parseInt(
      parentLi.querySelector("div.tree-node")!.getAttribute("level") || "1",
    );

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
      //expander.textContent = "▼";
      expander.innerHTML = ICONS.down;
    }

    createTreeNodes(
      [
        {
          level: parentLevel + 1,
          title: newTitle,
          page: location.position.pageIndex + 1,
          x: location.position.rects[0][0],
          y: location.position.rects[0][1],
        },
      ],
      childList,
      doc,
    );
    // 确保父节点展开
    parentLi.classList.remove("collapsed");
  }
  // 保存节点信息
  await saveOutlineToJSON();
}

function clickToPosition(targetElement: Element) {
  const reader = Zotero.Reader.getByTabID(
    ztoolkit.getGlobal("Zotero_Tabs").selectedID,
  );
  const treeNode = targetElement.closest("div.tree-node");
  if (!treeNode) return;

  const page = parseInt(treeNode.getAttribute("page")!);
  const x = parseInt(treeNode.getAttribute("x")!);
  const y = parseInt(treeNode.getAttribute("y")!);
  ztoolkit.log("Click to position", page, x, y);
  // const location = {
  //   position: { pageIndex: page - 1, rects: [[x, y, x, y]] },
  // };
  // @ts-ignore - not typed
  // reader.navigate(location);
  const PDFViewerApplication = (
    reader._internalReader._primaryView as _ZoteroTypes.Reader.PDFView
  )._iframeWindow.PDFViewerApplication;
  const pageView = PDFViewerApplication.pdfViewer!.getPageView(page - 1);
  // @ts-ignore - Not typed
  const [scrollX, scrollY] = pageView.viewport.convertToViewportPoint(x, y);
  (
    reader._internalReader._primaryView as _ZoteroTypes.Reader.PDFView
  )._iframeWindow!.PDFViewerApplication.page = page;
  const container = (
    reader._internalReader._primaryView as _ZoteroTypes.Reader.PDFView
  )._iframeWindow!.document.getElementById("viewerContainer")!;
  ztoolkit.log(`Scroll to ${scrollX}, ${scrollY}`);
  container.scrollBy(scrollX, scrollY);
}
