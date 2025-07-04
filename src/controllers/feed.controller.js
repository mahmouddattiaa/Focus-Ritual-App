const mongoose = require('mongoose');
const Post = require('../models/post.model.js');
const fs = require('fs').promises;
const { gcs } = require('../config/gcs.js');
const { Stats } = require('../models/stats.model');

exports.Post = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { parentId, content, attachExists, attachType } = req.body;
        const userId = req.user._id;
        const stats = await Stats.findOne({ userId })
        attachment = {}
        if (attachExists === 'true' && req.file) {
            const file = req.file;
            const fileContent = await fs.readFile(file.path);


            const key = `feed/${userId}/${Date.now()}_${file.originalname}`;
            const gcsFile = gcs.file(key);


            await gcsFile.save(fileContent, {
                contentType: file.mimetype,
            });


            attachment = {
                attachment: {
                    included: true,
                    type: attachType,
                    content: key
                }
            };


            await fs.unlink(file.path);
        }
        const post = new Post({
            userId: userId,
            content: content,
            parentId: parentId || null,
            ...attachment
        });
        await post.save();
        if (post) {
            stats.pts += 2;
            await stats.save();
            return res.status(200).json({
                message: ' post successfully made',
                post: post
            });
        }

    } catch (err) {
        console.log('failed to post due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }

};

exports.editPost = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { postId, content } = req.body;

        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Content cannot be empty' });
        }

        const post = await Post.findById(postId);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: 'You are not authorized to edit this post'
            });
        }

        post.content = content;
        await post.save();

        return res.status(200).json({
            message: 'Post updated successfully',
            post: post
        });

    } catch (err) {
        console.log('failed to edit post due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.deletePost = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { postId } = req.params;
        const post = await Post.findOne({ _id: postId });
        if (!post) {
            return res.status(400).json({
                message: 'there doesnt exist such a post'
            });

        }
        if (post.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: 'You are not authorized to delete this post'
            });
        }
        await Post.deleteOne({ _id: postId });
        return res.status(200).json({
            message: `post with ${postId} deleted succesfully`
        })

    } catch (err) {
        console.log('failed to delete post due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.likePost = async (req, res) => {

    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { postId } = req.body;
        const post = await Post.findById(postId);
        const userId = req.user._id;
        if (!post) {
            return res.status(400).json({
                message: 'there doesnt exist such a post'
            });
        }


        if (post.likes.users.some(id => id.toString() === userId.toString())) {
            return res.status(400).json({
                message: 'you already liked this post'
            });
        }
        const targetId = post.userId;
        const targetStats = await Stats.findOne({ userId: targetId });
        targetStats.pts += 2;
        await targetStats.save();

        post.likes.users.push(userId);
        post.likes.count++;
        await post.save();
        return res.status(200).json({
            message: `post with ${postId} liked succesfully`,
            likes: post.likes
        })

    } catch (err) {
        console.log('failed to like post due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

exports.removeLike = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { postId } = req.body;
        const post = await Post.findById(postId);
        const userId = req.user._id;
        if (!post) {
            return res.status(400).json({
                message: 'there doesnt exist such a post'
            });
        }
        if (!post.likes.users.some(id => id.toString() === userId.toString())) {
            return res.status(400).json({
                message: 'you havent even liked this post'
            });
        }

        const targetId = post.userId;
        const targetStats = await Stats.findOne({ userId: targetId });
        targetStats.pts -= 2;
        await targetStats.save();
        post.likes.users.pull(userId);
        post.likes.count--;
        await post.save();
        return res.status(200).json({
            message: `like for post with ${postId} removed succesfully`,
            likes: post.likes
        });

    } catch (err) {
        console.log('failed to remove like from post due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }

};

exports.getPosts = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { parentId } = req.query;
        const queryFilter = {
            parentId: parentId || null
        };
        const page = parseInt(req.query.page) || 0;
        const limit = parseInt(req.query.limit) || 50;
        const skip = page * limit;

        console.log('Fetching posts with filter:', queryFilter);
        console.log('User ID:', req.user._id);

        const posts = await Post.find(queryFilter).sort({ timePosted: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'firstName lastName profilePicture');

        console.log('Found posts:', posts.length);
        console.log('First post:', posts[0]);

        if (!posts || posts.length === 0) {
            return res.status(200).json({
                message: 'feed is empty',
                posts: []
            });
        }
        return res.status(200).json({
            message: 'posts succesfully fetched',
            posts: posts
        })

    } catch (err) {
        console.log('failed to fetch posts due to: ', err);
        return res.status(500).json({
            message: 'server error',
            error: err.message
        });
    }
};

