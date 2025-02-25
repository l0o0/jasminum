type LastUpdatedMap = {
  [filename: string]: { label: string; lastUpdated: string };
};

type TableRow = {
  filename: string;
  label: string;
  localUpdateTime: string;
  remoteUpdateTime: string;
};
