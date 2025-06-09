const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema ({
    email: {
        type: String,
        required: [true, 'please provide'],
        unique: true,
        match: [
            /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/,  
            'Please provide a valid email'
          ],
          lowercase: true
    },
    firstName: {
        type: String,
        required :  [true, 'please provide'],
        trim: true


    },
    lastName: {
        type: String,
        required :  [true, 'please provide'],
        trim: true
    },
    password : {
        type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false
    },
    profilePicture: {
type: String,
default: null
    },
    bio: {
type: String,
default: null
    }
},
{
    timestamps: true
});

UserSchema.pre('save', async function(next) {
if(!this.isModified('password')) return next();

try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
}
catch(error){
    next(error);
}
}

);

UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema); 