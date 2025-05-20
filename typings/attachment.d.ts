interface AttachmentService {
  searchAttachments(
    task: AttachmentTask,
  ): Promise<AttachmentSearchResult[] | null>;
  importAttachment(task: AttachmentTask): Promise<void>;
}

type AttachmentSearchResult = {
  title: string;
  filename: string;
  score?: number;
  url: string;
  source?: string;
};

interface AttachmentTask extends Task {
  type: AttachmentTaskType;
  searchResults?: AttachmentSearchResult[];
}
