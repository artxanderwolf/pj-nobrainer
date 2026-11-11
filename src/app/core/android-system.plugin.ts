import { registerPlugin } from '@capacitor/core';

export interface AndroidSaveExportRequest {
  json: string;
  fileName: string;
}

export interface AndroidSaveExportResult {
  status: 'saved' | 'cancelled';
  fileName?: string;
  bytesWritten?: number;
}

interface AndroidSystemBridge {
  exportSave(options: AndroidSaveExportRequest): Promise<AndroidSaveExportResult>;
}

export const AndroidSystem = registerPlugin<AndroidSystemBridge>('AndroidSystem');
