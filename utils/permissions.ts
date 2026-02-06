import * as MediaLibrary from 'expo-media-library';

export async function requestMediaLibraryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

export async function checkMediaLibraryPermission(): Promise<boolean> {
  const { status } = await MediaLibrary.getPermissionsAsync();
  return status === 'granted';
}
