const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');
const { LibraryFolder, LibraryFile, UploadedFile } = require('../models/models');
const path = require('path');
const multer = require('multer');
const libraryController = require('../controllers/library.controller');
const upload = require('../middleware/upload');

// Middleware to ensure user is authenticated
const auth = passport.authenticate('jwt', { session: false });

// Debug middleware
router.use((req, res, next) => {
    console.log(`[LIBRARY ROUTE] ${req.method} ${req.url}`);
    next();
});

// Helper to format items for response
const formatLibraryItem = (item, itemType) => {
    if (itemType === 'folder') {
        return {
            id: item._id,
            type: 'folder',
            name: item.name,
            parentId: item.parent_id,
            path: item.path,
            createdAt: item.created_at,
            modifiedAt: item.updated_at
        };
    } else {
        return {
            id: item._id,
            type: 'file',
            name: item.name,
            size: item.size,
            contentType: item.content_type,
            parentId: item.folder_id,
            path: item.path,
            fileId: item.file_id,
            createdAt: item.created_at,
            modifiedAt: item.updated_at
        };
    }
};

// Get root library items or items in a specific folder
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        console.log(`Getting root library items for user ${userId}`);

        // Find all root folders (parent_id is null)
        const folders = await LibraryFolder.find({
            user_id: userId,
            parent_id: null
        });

        // Find all root files (folder_id is null)
        const files = await LibraryFile.find({
            user_id: userId,
            folder_id: null
        });

        console.log(`Found ${folders.length} folders and ${files.length} files in root folder`);

        // Format the response
        const formattedFolders = folders.map(folder => formatLibraryItem(folder, 'folder'));
        const formattedFiles = files.map(file => formatLibraryItem(file, 'file'));

        res.json({
            success: true,
            items: [...formattedFolders, ...formattedFiles]
        });
    } catch (err) {
        console.error('Error fetching library items:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch library items',
            error: err.message
        });
    }
});

// Get items in a specific folder
router.get('/folder/:folderId', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { folderId } = req.params;

        // Validate folder ID
        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid folder ID'
            });
        }

        // First check if the folder exists and belongs to the user
        const folder = await LibraryFolder.findOne({
            _id: folderId,
            user_id: userId
        });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Find all subfolders within this folder
        const folders = await LibraryFolder.find({
            user_id: userId,
            parent_id: folderId
        });

        // Find all files within this folder
        const files = await LibraryFile.find({
            user_id: userId,
            folder_id: folderId
        });

        // Format the response
        const formattedFolders = folders.map(folder => formatLibraryItem(folder, 'folder'));
        const formattedFiles = files.map(file => formatLibraryItem(file, 'file'));

        res.json({
            success: true,
            items: [...formattedFolders, ...formattedFiles]
        });
    } catch (err) {
        console.error('Error fetching folder contents:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch folder contents',
            error: err.message
        });
    }
});

// Find folder by path
router.get('/path', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { path } = req.query;

        if (!path) {
            return res.status(400).json({
                success: false,
                message: 'Path parameter is required'
            });
        }

        // Build the path search query
        // Remove trailing slash if it exists
        const searchPath = path.endsWith('/') ? path.slice(0, -1) : path;

        // If it's the root path
        if (searchPath === '/' || searchPath === '') {
            return res.json({
                success: true,
                id: null,
                type: 'folder',
                name: 'Root',
                path: '/',
                parentId: null
            });
        }

        // Split the path to get the folder name and parent path
        const pathParts = searchPath.split('/').filter(p => p);
        const folderName = pathParts[pathParts.length - 1];
        const parentPath = '/' + pathParts.slice(0, -1).join('/');

        // Find the folder by name and path
        const folder = await LibraryFolder.findOne({
            user_id: userId,
            name: folderName,
            path: parentPath
        });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        res.json({
            success: true,
            ...formatLibraryItem(folder, 'folder')
        });
    } catch (err) {
        console.error('Error finding folder by path:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to find folder by path',
            error: err.message
        });
    }
});

// Create a new folder
router.post('/folder', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, parentId, path } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Folder name is required'
            });
        }

        // Determine the parent folder path
        let parentPath = '/';
        let parent = null;

        if (parentId && parentId !== 'root' && mongoose.Types.ObjectId.isValid(parentId)) {
            parent = await LibraryFolder.findOne({
                _id: parentId,
                user_id: userId
            });

            if (!parent) {
                return res.status(404).json({
                    success: false,
                    message: 'Parent folder not found'
                });
            }

            // Use the parent's path + name as this folder's path
            parentPath = parent.path.endsWith('/') ?
                `${parent.path}${parent.name}/` :
                `${parent.path}/${parent.name}`;
        }

        // Check if folder already exists at this path
        const existingFolder = await LibraryFolder.findOne({
            user_id: userId,
            name,
            parent_id: parent ? parent._id : null
        });

        if (existingFolder) {
            return res.status(409).json({
                success: false,
                message: 'Folder with this name already exists in this location'
            });
        }

        // Create the new folder
        const newFolder = new LibraryFolder({
            user_id: userId,
            name,
            parent_id: parent ? parent._id : null,
            path: parentPath
        });

        await newFolder.save();

        res.status(201).json({
            success: true,
            id: newFolder._id,
            message: 'Folder created successfully'
        });
    } catch (err) {
        console.error('Error creating folder:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to create folder',
            error: err.message
        });
    }
});

// Delete a folder
router.delete('/folder/:folderId', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { folderId } = req.params;

        // Validate folder ID
        if (!mongoose.Types.ObjectId.isValid(folderId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid folder ID'
            });
        }

        // Check if folder exists and belongs to user
        const folder = await LibraryFolder.findOne({
            _id: folderId,
            user_id: userId
        });

        if (!folder) {
            return res.status(404).json({
                success: false,
                message: 'Folder not found'
            });
        }

        // Check if folder has any items
        const hasSubfolders = await LibraryFolder.findOne({
            parent_id: folderId
        });

        const hasFiles = await LibraryFile.findOne({
            folder_id: folderId
        });

        if (hasSubfolders || hasFiles) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete non-empty folder'
            });
        }

        // Delete the folder
        await LibraryFolder.deleteOne({ _id: folderId });

        res.json({
            success: true,
            message: 'Folder deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting folder:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete folder',
            error: err.message
        });
    }
});

// Delete a file
router.delete('/file/:fileId', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const { fileId } = req.params;

        // Validate file ID
        if (!mongoose.Types.ObjectId.isValid(fileId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid file ID'
            });
        }

        // Check if file exists and belongs to user
        const libraryFile = await LibraryFile.findOne({
            _id: fileId,
            user_id: userId
        });

        if (!libraryFile) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        // Note: In a production environment, you would also delete the actual file from storage
        // But here we'll just remove the reference from the library

        // Delete the file record
        await LibraryFile.deleteOne({ _id: fileId });

        res.json({
            success: true,
            message: 'File deleted from library successfully'
        });
    } catch (err) {
        console.error('Error deleting file:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file',
            error: err.message
        });
    }
});

// Route for generating AI content from a PDF
router.post('/analyze-pdf', passport.authenticate('jwt', { session: false }), upload.single('file'), libraryController.analyzePdf);

// Route for retrieving previously generated lecture content
router.get('/content/:lectureId', passport.authenticate('jwt', { session: false }), libraryController.getLectureContent);

// Get all subjects and lectures with content
router.get('/subjects-lectures', auth, libraryController.getAllSubjectsAndLectures);

module.exports = router;