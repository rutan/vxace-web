import { contextBridge, ipcRenderer } from 'electron';
import { converterChannels, type AppLanguage, type ConverterApi } from '../shared/converterApi';

const api: ConverterApi = {
  selectGameDirectory: () => ipcRenderer.invoke(converterChannels.selectGameDirectory),
  selectOutputDirectory: () => ipcRenderer.invoke(converterChannels.selectOutputDirectory),
  selectHtmlInjectionFiles: () => ipcRenderer.invoke(converterChannels.selectHtmlInjectionFiles),
  analyzeGameDirectory: (request) => ipcRenderer.invoke(converterChannels.analyzeGameDirectory, request),
  convertGame: (request) => ipcRenderer.invoke(converterChannels.convertGame, request),
  openPath: (path) => ipcRenderer.invoke(converterChannels.openPath, path),
  startPreviewServer: (request) => ipcRenderer.invoke(converterChannels.startPreviewServer, request),
  stopPreviewServer: () => ipcRenderer.invoke(converterChannels.stopPreviewServer),
  openPreviewUrl: (url) => ipcRenderer.invoke(converterChannels.openPreviewUrl, url),
  setLanguage: (language) => ipcRenderer.invoke(converterChannels.setLanguage, language),
  loadLastDraft: () => ipcRenderer.invoke(converterChannels.loadLastDraft),
  saveLastDraft: (draft) => ipcRenderer.invoke(converterChannels.saveLastDraft, draft),
  openSettingsFile: () => ipcRenderer.invoke(converterChannels.openSettingsFile),
  saveSettingsFile: (draft) => ipcRenderer.invoke(converterChannels.saveSettingsFile, draft),
  onLanguageChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, language: AppLanguage) => {
      callback(language);
    };

    ipcRenderer.on(converterChannels.languageChanged, listener);
    return () => {
      ipcRenderer.off(converterChannels.languageChanged, listener);
    };
  },
  onNewDraftRequested: (callback) => {
    const listener = () => {
      callback();
    };

    ipcRenderer.on(converterChannels.newDraftRequested, listener);
    return () => {
      ipcRenderer.off(converterChannels.newDraftRequested, listener);
    };
  },
  onOpenSettingsFileRequested: (callback) => {
    return onMenuRequest(converterChannels.openSettingsFileRequested, callback);
  },
  onSaveSettingsFileRequested: (callback) => {
    return onMenuRequest(converterChannels.saveSettingsFileRequested, callback);
  },
};

const onMenuRequest = (channel: string, callback: () => void) => {
  const listener = () => {
    callback();
  };

  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.off(channel, listener);
  };
};

contextBridge.exposeInMainWorld('vxaceConverter', api);
