import { useContext } from 'react';
import { UploadContext } from '../context/uploadContext';

export const useUpload = () => useContext(UploadContext);
