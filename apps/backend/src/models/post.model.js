const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
userId :{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
},

content: {
    type: String,
    default: ""
},
attachment:{
    included:{
        type: Boolean,
        default: false
    },
    type: { type: String, enum: ['image', 'video', 'file', 'link'], default: 'image' },
    content:{
        type:String,
        default: ""
    }
},
timePosted:{
    type: Date,
    default: Date.now
},
likes: {
    users:{
        type:[
{
    type: mongoose.Schema.Types.ObjectId, ref: 'User' 
}
        ],
        default: []
    },
    count:{
        type: Number,
        default: 0
    }
},
parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post', 
    default: null 
  }


})

module.exports = mongoose.model('Post', postSchema);