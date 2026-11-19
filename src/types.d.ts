declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      src?: string;
      partition?: string;
      useragent?: string;
      allowpopups?: boolean;
      onLoad?: () => void;
      onDomReady?: () => void;
      onDidFailLoad?: (event: { errorCode: number; errorDescription: string }) => void;
      onConsoleMessage?: (event: { message: string; level: number; line: number; sourceId: string }) => void;
      onTitleUpdated?: (event: { title: string }) => void;
    };
  }
}
