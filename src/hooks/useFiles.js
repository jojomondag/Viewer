import { useState, useCallback } from 'react';
import { openFolder, scanDirectory, readMarkdownFile, saveMarkdownFile } from '../utils/fileSystem';

const useFiles = () => {
  const [directories, setDirectories] = useState([]);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFile, setCurrentFile] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Open a folder and scan for markdown files
  const openAndScanFolder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to open folder using fileSystem utility with multiSelect enabled
      const selectedFolders = await openFolder();
      
      // Check if folder selection was cancelled or empty
      if (!selectedFolders || selectedFolders.length === 0) {
        console.log('Folder selection was cancelled or returned empty');
        setLoading(false);
        return null;
      }
      
      // Process all selected folders
      let allFolders = [];
      let allFiles = [];
      let addedDirectories = [];
      
      // Loop through each selected folder and scan it
      for (const folderPath of selectedFolders) {
        // Check if this folder is already in our list
        if (directories.includes(folderPath)) {
          console.log(`Folder already added: ${folderPath}`);
          continue; // Skip this folder
        }
        
        // Register this folder as imported to prevent duplicate file creation
        if (window.api && window.api.registerImportedFolder) {
          window.api.registerImportedFolder(folderPath);
        }
        
        // Add to our list of added directories
        addedDirectories.push(folderPath);
        
        // Scan the directory for files and folders
        const result = await scanDirectory(folderPath);
        
        // Make sure we have valid folders and files
        const scannedFolders = result?.folders || [];
        const markdownFiles = result?.files || [];
        
        // Add to our collection
        allFolders = [...allFolders, ...scannedFolders];
        allFiles = [...allFiles, ...markdownFiles];
      }
      
      // Update state with all the new directories, folders and files
      if (addedDirectories.length > 0) {
        setDirectories(prev => [...prev, ...addedDirectories]);
        setFolders(prev => [...prev, ...allFolders]);
        setFiles(prev => [...prev, ...allFiles]);
      }
      
      // Return info about what was added
      return { 
        folderPaths: addedDirectories,
        folders: allFolders,
        files: allFiles
      };
    } catch (err) {
      setError(err.message || 'Failed to open folder');
      console.error('Error opening folder:', err);
      throw err; // Rethrow to let the caller handle it
    } finally {
      setLoading(false);
    }
  }, [directories]);

  // Helper to clear all folders
  const clearFolders = useCallback(() => {
    setDirectories([]);
    setFolders([]);
    setFiles([]);
    setCurrentFile(null);
    setContent('');
  }, []);

  // Open a markdown file
  const openFile = useCallback(async (file) => {
    console.log(`[useFiles] openFile called for: ${file?.path}`);
    console.log(`[useFiles] Current file before change: ${currentFile?.path}`);
    
    // Return a Promise that resolves after the file is opened
    return new Promise(async (resolve, reject) => {
      try {
        setLoading(true);
        setError(null);
        
        // Validate file object
        if (!file || !file.path) {
          const errorMsg = 'Invalid file object provided to openFile';
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          reject(new Error(errorMsg));
          return;
        }
        
        console.log(`[useFiles] Reading content for file: ${file.path}`);
        const fileContent = await readMarkdownFile(file.path);
        
        // Ensure content is set to empty string if undefined/null
        console.log(`[useFiles] Content read, length: ${fileContent ? fileContent.length : 0}`);
        setContent(fileContent || '');
        console.log(`[useFiles] Content set, now setting currentFile`);
        setCurrentFile(file);
        console.log(`[useFiles] Successfully set content and currentFile for: ${file?.path}`);
        
        setLoading(false);
        resolve(file); // Resolve the promise with the file object
      } catch (err) {
        const errorMsg = err.message || 'Failed to open file';
        setError(errorMsg);
        console.error(`Error opening file: ${errorMsg}`, err);
        // Set empty content on error to avoid undefined issues
        setContent('');
        setLoading(false);
        reject(err); // Reject the promise with the error
      }
    });
  }, []);

  // Save the current file
  const saveFile = useCallback(async (newContent) => {
    if (!currentFile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Ensure content is never undefined
      const contentToSave = newContent || '';
      
      await saveMarkdownFile(currentFile.path, contentToSave);
      setContent(contentToSave);
    } catch (err) {
      setError(err.message || 'Failed to save file');
      console.error('Error saving file:', err);
    } finally {
      setLoading(false);
    }
  }, [currentFile]);

  // Update content without saving
  const updateContent = useCallback((newContent) => {
    // Ensure content is never undefined
    setContent(newContent || '');
  }, []);

  return {
    directories,
    files,
    folders,
    currentFile,
    content,
    loading,
    error,
    openAndScanFolder,
    clearFolders,
    openFile,
    saveFile,
    updateContent,
    setFiles,
    setFolders,
    setCurrentFile
  };
};

export default useFiles;