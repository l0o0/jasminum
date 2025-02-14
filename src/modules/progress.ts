import {
  ElementProps,
  TagElementProps,
} from "zotero-plugin-toolkit/dist/tools/ui";

export class Progress {
  public taskList: ScrapeTask[] = [];
  public progressWindow: Window | null;
  private statusIcons: Record<string, string> = {};

  constructor() {
    this.progressWindow = null;
    this.statusIcons = {
      waiting: "chrome://jasminum/content/icons/loading-loop.svg",
      processing: "chrome://jasminum/content/icons/loading-loop.svg",
      multiple_results: "chrome://jasminum/content/icons/loading-loop.svg",
      success: "chrome://jasminum/content/icons/check.svg",
      fail: "chrome://jasminum/content/icons/cross.svg",
    };
    this.taskList = [];
  }

  // Add new task to task list.
  // If progress window is not open, open it.
  public async addTask(task: ScrapeTask): Promise<void> {
    this.taskList.push(task);
    if (task.silent == true) return;
    if (this.progressWindow) {
      this.addTaskToProgressWindow(task);
    } else {
      await this.openProgressWindow();
      this.addTaskToProgressWindow(task);
    }
  }

  public async openProgressWindow(): Promise<void> {
    ztoolkit.log(`Open progress window.`);
    const win = Services.wm.getMostRecentWindow("navigator:browser") as Window;
    const htmlUrl = "chrome://jasminum/content/progress.xhtml";
    const chromeArgs =
      "chrome,centerscreen,width=960,height=400,dialog=yes,resizable=no,status=no";

    const windowArgs = { _initPromise: Zotero.Promise.defer() };

    if (win) {
      this.progressWindow = win.openDialog(htmlUrl, "", chromeArgs, windowArgs);
      this.progressWindow!.onbeforeunload = (e) => {
        this.progressWindow = null;
        this.taskList = [];
      };
      // For close button in header bar
      this.progressWindow!.onclose = (e) => {
        this.progressWindow = null;
        this.taskList = [];
      };
      let t = 0;
      // Wait for window
      while (
        t < 500 &&
        this.progressWindow!.document.readyState !== "complete"
      ) {
        // @ts-ignore -- Delay is not typed.
        await ztoolkit.getGlobal("Zotero").Promise.delay(10);
        t += 1;
      }
      await windowArgs._initPromise.promise;
    } else {
      ztoolkit.log(`Maybe this is an error. No main window found.`);
      // return Services.ww.openWindow(null, htmlUrl, "", chromeArgs, io);
    }
  }

  private createSearchResultProps(
    task: ScrapeTask,
    searchResults: ScrapeSearchResult[],
  ): TagElementProps {
    return {
      tag: "div",
      classList: ["search-results-container"],
      id: `search-results-container-${task.id}`,
      children: [
        {
          namespace: "html",
          tag: "button",
          classList: ["confirm-button"],
          properties: {
            innerText: "确认",
          },
          attributes: { "data-task-id": task.id },
        },
        {
          tag: "div",
          classList: ["search-results"],
          id: `search-results-${task.id}`,
          children: searchResults.map((result, index) => ({
            tag: "div",
            classList: ["search-result"],
            children: [
              {
                tag: "input",
                properties: {
                  type: "radio",
                  name: `task-${task.id}`,
                },
                attributes: {
                  "data-task-id": `${task.id}`,
                  "data-result-index": `${index}`,
                },
              },
              {
                tag: "div",
                classList: ["info"],
                children: [
                  {
                    tag: "span",
                    classList: ["source"],
                    properties: { innerText: `来源: ${result.source}` },
                  },
                  {
                    tag: "span",
                    classList: ["title"],
                    properties: { innerText: `${result.title}` },
                  },
                ],
              },
            ],
          })),
        },
      ],
    };
  }

  // Add new task to progress window.
  public addTaskToProgressWindow(task: ScrapeTask): void {
    if (this.progressWindow) {
      ztoolkit.log("Add task to progress window.");
      const taskNodeProps: ElementProps = {
        classList: ["task"],
        children: [
          {
            tag: "div",
            classList: ["task-header"],
            id: `task-header-${task.id}`,
          },
        ],
        attributes: { "data-task-id": task.id },
      };
      const searchContainer: TagElementProps = {
        tag: "div",
        classList: ["search-results-container"],
        id: `search-results-container-${task.id}`,
        properties: { style: "display: none;" },
        children: [
          {
            namespace: "html",
            tag: "button",
            classList: ["confirm-button"],
            properties: { innerText: "确认" },
            attributes: { "data-task-id": task.id },
          },
        ],
      };
      // <object type="image/svg+xml" data="A.svg"></object>
      const taskHeaderChildren: TagElementProps[] = [
        {
          tag: "img",
          classList: ["task-status"],
          id: `task-status-${task.id}`,
          properties: { src: this.statusIcons[task.status] },
        },
        {
          tag: "span",
          classList: ["task-title"],
          properties: { innerText: task.item.getField("title") },
        },
      ];

      // if (task.searchResult && task.searchResult.length > 0) {

      // }

      taskNodeProps.children![0].children = taskHeaderChildren;
      taskNodeProps.children?.push(searchContainer);

      const taskNode = ztoolkit.UI.createElement(
        this.progressWindow!.document,
        "div",
        taskNodeProps,
      );

      this.progressWindow.document
        .querySelector("#task-list")
        ?.appendChild(taskNode);
    }
  }
  // Update task status icon. Display error msgs when task fails.
  public updateTaskStatus(task: ScrapeTask, status: string): void {
    if (this.progressWindow) {
      this.progressWindow.document
        .querySelector(`#task-status-${task.id}`)
        ?.setAttribute("src", this.statusIcons[status]);
      // Display a error msg.
      if (status == "fail") {
        const span = ztoolkit.UI.createElement(
          this.progressWindow.document,
          "img",
          {
            id: `task-msg-${task.id}`,
            classList: ["task-msg"],
            properties: {
              src: "chrome://jasminum/content/icons/notify.svg",
            },
            attributes: { title: task.message },
          },
        );
        this.progressWindow.document
          .querySelector(`#task-header-${task.id} > span.task-title`)
          ?.appendChild(span);
      }
    }
  }

  public updateTaskSearchResult(
    task: ScrapeTask,
    searchResults: ScrapeSearchResult[],
  ): void {
    if (this.progressWindow) {
      ztoolkit.log(searchResults);
      const props = this.createSearchResultProps(task, searchResults);
      const taskSearchNode = ztoolkit.UI.createElement(
        this.progressWindow.document,
        "div",
        props,
      );
      const toggle = ztoolkit.UI.createElement(
        this.progressWindow.document,
        "span",
        {
          classList: ["toggle-icon"],
          id: `toggle-icon-${task.id}`,
          properties: { innerText: "▼" },
        },
      );
      // Replace the old search result node with the new one.
      this.progressWindow.document
        .querySelector(`#search-results-container-${task.id}`)!
        .replaceWith(taskSearchNode);
      this.progressWindow.document
        .querySelector(`#task-header-${task.id}`)!
        .appendChild(toggle);
    }
  }
}
