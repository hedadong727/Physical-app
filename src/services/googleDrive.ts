/**
 * Google Drive API Service
 * Handles listing, saving, downloading, and deleting physics experiment files and snapshots.
 */

import {
  AxisMotionConfig,
  ObservationMode,
  VectorDisplayOptions,
  InstantaneousState,
  MotionAnalysis,
} from '../types/physics';

export const APP_DRIVE_FOLDER_NAME = '物理运动合成与分解实验课件';

export interface ExperimentReportData {
  title: string;
  timestamp: string;
  presetName?: string;
  notes?: string;
  xConfig: AxisMotionConfig;
  yConfig: AxisMotionConfig;
  observationMode: ObservationMode;
  vectorOptions: VectorDisplayOptions;
  duration: number;
  currentTime: number;
  instantaneousState: InstantaneousState;
  motionAnalysis: MotionAnalysis;
  appVersion: string;
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime: string;
  modifiedTime?: string;
  webViewLink?: string;
  thumbnailLink?: string;
  description?: string;
}

/**
 * Searches for existing app folder or creates a new one in the user's Google Drive.
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${APP_DRIVE_FOLDER_NAME}' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`无法查询云端硬盘文件夹: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Folder does not exist, create it
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: APP_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: '高中物理运动的合成与分解演示实验室云端课件与学生实验归档目录',
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`无法创建云端硬盘实验文件夹: ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Uploads a PNG blob snapshot to Google Drive using multipart upload.
 */
export async function uploadImageToDrive({
  imageBlob,
  fileName,
  accessToken,
  description,
  folderId,
}: {
  imageBlob: Blob;
  fileName: string;
  accessToken: string;
  description?: string;
  folderId?: string;
}): Promise<DriveFileItem> {
  const targetFolderId = folderId || (await getOrCreateAppFolder(accessToken));

  const metadata = {
    name: fileName.endsWith('.png') ? fileName : `${fileName}.png`,
    mimeType: 'image/png',
    parents: [targetFolderId],
    description: description || '高中物理运动的合成与分解高清晰度运动轨迹快照',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
    metadata
  )}`;
  const mediaHeader = `${delimiter}Content-Type: image/png\r\n\r\n`;

  const metadataBlob = new Blob([metadataPart + mediaHeader], { type: 'text/plain' });
  const closeBlob = new Blob([closeDelimiter], { type: 'text/plain' });

  const multipartBody = new Blob([metadataBlob, imageBlob, closeBlob], {
    type: `multipart/related; boundary=${boundary}`,
  });

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`图片上传至 Google Drive 失败: ${errText}`);
  }

  return await res.json();
}

/**
 * Saves a structured experiment report JSON file to Google Drive.
 */
export async function saveExperimentToDrive({
  data,
  accessToken,
  imageBlob,
}: {
  data: ExperimentReportData;
  accessToken: string;
  imageBlob?: Blob | null;
}): Promise<{
  reportFile: DriveFileItem;
  imageFile?: DriveFileItem;
}> {
  const folderId = await getOrCreateAppFolder(accessToken);

  let imageFile: DriveFileItem | undefined;
  if (imageBlob) {
    const imgName = `${data.title}_运动轨迹快照_${new Date().toISOString().slice(0, 10)}.png`;
    imageFile = await uploadImageToDrive({
      imageBlob,
      fileName: imgName,
      accessToken,
      description: `配图：${data.title} 轨迹快照`,
      folderId,
    });
  }

  const fileContent = JSON.stringify(
    {
      ...data,
      snapshotImageFileId: imageFile?.id,
      snapshotImageViewLink: imageFile?.webViewLink,
    },
    null,
    2
  );

  const fileName = `${data.title}.physics-lab.json`;
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    parents: [folderId],
    description: `物理实验配置与推导报告: ${data.presetName || '自定义运动'} (时间 t=${data.currentTime.toFixed(
      2
    )}s)`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody = new Blob(
    [
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`,
      `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${fileContent}`,
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`实验数据上传至 Google Drive 失败: ${errText}`);
  }

  const reportFile = await res.json();
  return { reportFile, imageFile };
}

/**
 * Lists experiment files and snapshots in the app's Google Drive folder.
 */
export async function listExperimentFiles(accessToken: string): Promise<DriveFileItem[]> {
  try {
    const folderId = await getOrCreateAppFolder(accessToken);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);

    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime desc&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,description)&pageSize=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`获取云端硬盘文件列表失败: ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (error) {
    console.error('listExperimentFiles error:', error);
    throw error;
  }
}

/**
 * Reads experiment JSON data from Google Drive.
 */
export async function getExperimentFileContent(
  fileId: string,
  accessToken: string
): Promise<ExperimentReportData> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`无法读取云端实验文件内容: ${errText}`);
  }

  return await res.json();
}

/**
 * Deletes a file from Google Drive.
 * NOTE: The caller MUST always provide user confirmation before invoking this!
 */
export async function deleteDriveFile(fileId: string, accessToken: string): Promise<void> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const errText = await res.text();
    throw new Error(`删除云端硬盘文件失败: ${errText}`);
  }
}
