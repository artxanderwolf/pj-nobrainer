import { PluginListenerHandle, registerPlugin } from '@capacitor/core';

export interface AndroidUpdaterCurrentInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
}

export interface AndroidUpdaterVerificationOptions {
  apkUrl: string;
  apkSize: number;
  sha256: string;
  versionName: string;
  versionCode: number;
}

export interface AndroidUpdaterDownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percent: number;
}

export interface AndroidUpdaterDownloadResult {
  status: 'ready';
  bytesDownloaded: number;
}

export interface AndroidUpdaterSaveResult {
  status: 'saved' | 'cancelled';
  fileName?: string;
}

interface AndroidUpdaterPlugin {
  getCurrentInfo(): Promise<AndroidUpdaterCurrentInfo>;
  downloadAndVerify(options: AndroidUpdaterVerificationOptions): Promise<AndroidUpdaterDownloadResult>;
  saveVerifiedUpdate(options: Omit<AndroidUpdaterVerificationOptions, 'apkUrl'>): Promise<AndroidUpdaterSaveResult>;
  clearDownloadedUpdate(): Promise<void>;
  addListener(eventName: 'downloadProgress', listenerFunc: (event: AndroidUpdaterDownloadProgress) => void): Promise<PluginListenerHandle>;
}

export const AndroidUpdater = registerPlugin<AndroidUpdaterPlugin>('AndroidUpdater');
