if (typeof globalThis.File === 'undefined' && typeof globalThis.Blob !== 'undefined') {
  class Node18File extends Blob {
    name: string;
    lastModified: number;
    webkitRelativePath: string;

    constructor(fileBits: any[], fileName: string, options: { type?: string; lastModified?: number } = {}) {
      super(fileBits, options);
      this.name = String(fileName);
      this.lastModified = options.lastModified ?? Date.now();
      this.webkitRelativePath = '';
    }

    get [Symbol.toStringTag]() {
      return 'File';
    }
  }

  (globalThis as any).File = Node18File;
}

export {};
