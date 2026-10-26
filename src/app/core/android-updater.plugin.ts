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

export interface AndroidUpdaterInstallResult {
  status: 'installer-started' | 'permission-required';
}

export interface AndroidUpdaterInstallStatus {
  status: string;
  message?: string;
}

interface AndroidUpdaterPlugin {
  getCurrentInfo(): Promise<AndroidUpdaterCurrentInfo>;
  downloadAndVerify(options: AndroidUpdaterVerificationOptions): Promise<AndroidUpdaterDownloadResult>;
  installVerified(options: AndroidUpdaterVerificationOptions): Promise<AndroidUpdaterInstallResult>;
  openInstallPermissionSettings(): Promise<void>;
  clearDownloadedUpdate(): Promise<void>;
  getInstallStatus(): Promise<AndroidUpdaterInstallStatus>;
  addListener(eventName: 'downloadProgress', listenerFunc: (event: AndroidUpdaterDownloadProgress) => void): Promise<PluginListenerHandle>;
}

export const AndroidUpdater = registerPlugin<AndroidUpdaterPlugin>('AndroidUpdater');
