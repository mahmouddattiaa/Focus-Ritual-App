const User = require('../models/user.model');

exports.addFriend = async (req, res) => {
    try{
if(!req.user){
    return res.status(401).json({
        message: 'unauthorized'
    });
    }
    const userId = req.user._id;
    const {friendId} = req.body;
    if(!friendId)
    {
        return res.status(400).json({
            message: 'you need a friendId'
        });
    }
    if (userId.toString() === friendId) {
        return res.status(400).json({
            message: "You can't add yourself as a friend"
        });
    }
    const friend = await User.findOne({_id : friendId});
    if(!friend){
        return res.status(400).json({
            message: 'this user doesnt exist'
        });
    }
    if(await User.findOne({_id : userId, friends : friendId}))
    {
        return res.status(400).json({
            message: 'this user is already your friend'
        });
    }
    else if(await User.findOne({_id : friendId, 'friendRequests.friendId': userId}))
    {
        return res.status(400).json({
            message: 'you already have a friend request to this user'
        });
    }
    friend.friendRequests.push({ friendId: userId});
    await friend.save();
    return res.status(200).json({
        message: 'successfully sent a friend request to user',
        friendFirstName: friend.firstName,
        friendLastName: friend.lastName,
        friendPfp: friend.profilePicture
    });
} catch(err){
    console.log('couldnt send request due to :', err);
    return res.status(500).json({
        message: 'server error',
        error: err.message
    });
}
};

exports.acceptFriend = async (req,res) => {
    try{
        if(!req.user){
            return res.status(401).json({
                message: 'unauthorized'
            });
            }
            const userId = req.user._id;
            const {friendId} = req.body;
            if(!friendId)
            {
                return res.status(400).json({
                    message: 'you need a friendId'
                });
            }
            const user = await User.findById(userId);
            const friend = await User.findById(friendId);
            if(!friend){
                return res.status(400).json({
                    message: 'this user doesnt exist'
                });
            }
            if(await User.findOne({_id : userId, friends : friendId}))
                {
                    return res.status(400).json({
                        message: 'this user is already your friend'
                    });
                }
                else if(!await User.findOne({_id : userId, 'friendRequests.friendId': friendId}))
                {
                    return res.status(400).json({
                        message: 'you dont have a friend request to this user'
                    });
                }
                user.friends.push(friendId);
                friend.friends.push(userId);
                user.friendRequests.pull({friendId: friendId});
                await user.save();
                await friend.save();
                return res.status(200).json({
                    message: 'successfully accepted friend request',
                })
           
        }catch(err){
            console.log('couldnt accept request due to :', err);
            return res.status(500).json({
                message: 'server error',
                error: err.message
            });
        }
};

exports.declineFriend = async (req,res) => {
    try{
        if(!req.user){
            return res.status(401).json({
                message: 'unauthorized'
            });
            }
            const userId = req.user._id;
            const {friendId} = req.body;
            if(!friendId)
            {
                return res.status(400).json({
                    message: 'you need a friendId'
                });
            }
            const user = await User.findById(userId);
            const friend = await User.findById(friendId);
            if(!friend){
                return res.status(400).json({
                    message: 'this user doesnt exist'
                });
            }
            if(await User.findOne({_id : userId, friends: friendId}))
                {
                    return res.status(400).json({
                        message: 'this user is already your friend'
                    });
                }
                else if(!await User.findOne({_id : userId, 'friendRequests.friendId': friendId}))
                {
                    return res.status(400).json({
                        message: 'you dont have a friend request to this user'
                    });
                }

                user.friendRequests.pull({friendId: friendId});
              
                await user.save();
                return res.status(200).json({
                    message: 'successfully declined friend request',
                })
           
        }catch(err){
            console.log('couldnt decline request due to :', err);
            return res.status(500).json({
                message: 'server error',
                error: err.message
            });
        }
};

exports.getFriendList = async (req, res) =>{
    try{
        if(!req.user){
            return res.status(401).json({
                message: 'unauthorized'
            });
            }
            const userId = req.user._id;
            const user = await User.findOne({_id: userId}).populate('friends', 'firstName lastName profilePicture');
            if (!user) {
                return res.status(404).json({ message: 'user not found' });
            }
            return res.status(200).json({
                message: 'successfully fetched friends list',
                friends: user.friends
            })
        }catch(err){
            console.log('couldnt get friendslist due to :', err);
            return res.status(500).json({
                message: 'server error',
                error: err.message
            });
        }

};

exports.getFriendInfo = async (req, res) => {
    try{
        if(!req.user){
            return res.status(401).json({
                message: 'unauthorized'
            });
            }
            const userId = req.user._id;
            const {friendId} = req.params;
            const friend = await User.findById(friendId);
            if(!friend)
            {
                return res.status(400).json({
                    message: 'friend doesnt exist'
                  
                });
            }
            return res.status(200).json({
                message: 'successfully fetched friends info',
                friendFirstName: friend.firstName,
                friendLastName: friend.lastName,
                friendBio: friend.bio,
                friendPfp: friend.profilePicture
            })
        }catch(err){
            console.log('couldnt get friend info due to :', err);
            return res.status(500).json({
                message: 'server error',
                error: err.message
            });
        }
};

exports.getFriendRequests = async (req, res) => {
    try{
        if(!req.user){
            return res.status(401).json({
                message: 'unauthorized'
            });
            }
            const userId = req.user._id;
            const user = await User.findOne({_id: userId});
            if (!user) {
                return res.status(404).json({ message: 'user not found' });
            }
            return res.status(200).json({
                message: 'successfully fetched friend requests',
                friendRequests: user.friendRequests
            })
        }catch(err){
            console.log('couldnt get friend requests due to :', err);
            return res.status(500).json({
                message: 'server error',
                error: err.message
            });
        }
};

exports.unfriend = async (req, res) => {
    try{
        if(!req.user){
            return res.status(401).json({
                message: 'unauthorized'
            });
            }
            const userId = req.user._id;
            const {friendId} = req.body;
            if(!friendId)
            {
                return res.status(400).json({
                    message: 'you need a friendId'
                });
            }
            const user = await User.findById(userId);
            const friend = await User.findById(friendId);
            if(!friend){
                return res.status(400).json({
                    message: 'this user doesnt exist'
                });
            }
            if(!await User.findOne({_id : userId, friends: friendId}))
                {
                    return res.status(400).json({
                        message: 'this user isnt in your friends list'
                    });
                }

                user.friends.pull(friendId);
                friend.friends.pull(userId);
                await user.save();
                await friend.save();
                return res.status(200).json({
                    message: 'successfully removed friend ',
                })
           
        }catch(err){
            console.log('couldnt remove friend due to :', err);
            return res.status(500).json({
                message: 'server error',
                error: err.message
            });
        }
};